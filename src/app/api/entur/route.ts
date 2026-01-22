import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const ENTUR_VM_ENDPOINT = "https://api.entur.io/realtime/v1/rest/vm";
const ENTUR_REFRESH_MS = 15000;
const ENTUR_RATE_LIMIT_WINDOW_MS = 60000;
const ENTUR_RATE_LIMIT_MAX = 4;
const NEARBY_STOP_RADIUS_METERS = 1000;

type StopInfo = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isDestination?: boolean;
};

type BusInfo = {
  id: string;
  name: string;
  currentStop: string;
  destination: string;
  destinationStopId: string | undefined;
  latitude: number | null;
  longitude: number | null;
  nearbyStops?: StopInfo[];
};

type CacheEntry = {
  data: BusInfo[];
  fetchedAt: number;
  inFlight: Promise<BusInfo[]> | null;
};

const operatorCache = new Map<string, CacheEntry>();
const globalFetchTimestamps: number[] = [];

let stopsCache: StopInfo[] | null = null;

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const loadStops = async (): Promise<StopInfo[]> => {
  if (stopsCache) {
    return stopsCache;
  }
  const filePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "data",
    "stops.txt",
  );
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const stops: StopInfo[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    const columns = line.split(",");
    if (columns.length < 4) {
      continue;
    }
    const id = columns[0];
    const name = columns[1];
    const latitude = Number(columns[2]);
    const longitude = Number(columns[3]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }
    stops.push({ id, name, latitude, longitude });
  }
  stopsCache = stops;
  return stops;
};

const normalizeText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return normalizeText(value[0]);
  }
  if (value && typeof value === "object") {
    if ("value" in value) {
      return normalizeText((value as { value?: unknown }).value);
    }
    if ("text" in value) {
      return normalizeText((value as { text?: unknown }).text);
    }
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
};

const normalizeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeArray = <T,>(value: T | T[] | undefined | null): T[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};


const extractBuses = (payload: Record<string, unknown>): BusInfo[] => {
  const siri = payload as {
    Siri?: { ServiceDelivery?: { VehicleMonitoringDelivery?: unknown } };
    ServiceDelivery?: { VehicleMonitoringDelivery?: unknown };
    VehicleMonitoringDelivery?: unknown;
  };
  const deliveries =
    siri.Siri?.ServiceDelivery?.VehicleMonitoringDelivery ??
    siri.ServiceDelivery?.VehicleMonitoringDelivery ??
    siri.VehicleMonitoringDelivery;

  const activities = normalizeArray(deliveries).flatMap((delivery) =>
    normalizeArray(
      (delivery as { VehicleActivity?: unknown }).VehicleActivity,
    ),
  );

  const buses = activities
    .map((activity, index): BusInfo | null => {
      const journey = (activity as { MonitoredVehicleJourney?: unknown })
        .MonitoredVehicleJourney as Record<string, unknown> | undefined;
      if (!journey) {
        return null;
      }

      const vehicleMode = normalizeText(
        journey.VehicleMode ?? journey.VehicleCategory,
      ).toLowerCase();
      if (vehicleMode && !vehicleMode.includes("bus")) {
        return null;
      }

      const location = journey.VehicleLocation as
        | Record<string, unknown>
        | undefined;
      const latitude = normalizeNumber(
        location?.Latitude ?? location?.latitude,
      );
      const longitude = normalizeNumber(
        location?.Longitude ?? location?.longitude,
      );

      const name =
        normalizeText(journey.LineName) ||
        normalizeText(journey.PublishedLineName) ||
        normalizeText(journey.LineRef) ||
        normalizeText(journey.VehicleRef) ||
        "Unknown line";

      const rawDestinationRef = journey.DestinationRef;
      const destinationStopId = normalizeText(rawDestinationRef);

      const destination =
        normalizeText(journey.DestinationName) ||
        normalizeText(rawDestinationRef) ||
        "Unknown destination";

      const monitoredCall = journey.MonitoredCall as
        | Record<string, unknown>
        | undefined;
      const currentStop =
        normalizeText(monitoredCall?.StopPointName) ||
        normalizeText(monitoredCall?.StopPointRef) ||
        "Unknown stop";

      const id =
        normalizeText(journey.VehicleRef) ||
        normalizeText((activity as { ItemIdentifier?: unknown }).ItemIdentifier) ||
        `${name}-${index}`;

      const bus: BusInfo = {
        id,
        name,
        currentStop,
        destination,
        destinationStopId: destinationStopId || undefined,
        latitude,
        longitude,
      };
      return bus;
    })
    .filter((entry): entry is BusInfo => entry !== null);

  return buses;
};

const fetchFromEntur = async (operator: string, clientName: string) => {
  const url = new URL(ENTUR_VM_ENDPOINT);
  url.searchParams.set("datasetId", operator);
  url.searchParams.set("maxSize", "1500");

  const response = await fetch(url.toString(), {
    headers: {
      "ET-Client-Name": clientName,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Entur request failed.");
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return extractBuses(payload);
};

const getAvailableBuses = async (operator: string, clientName: string) => {
  const now = Date.now();
  const entry = operatorCache.get(operator) ?? {
    data: [],
    fetchedAt: 0,
    inFlight: null,
  };

  if (entry.inFlight) {
    return entry.inFlight;
  }

  if (entry.data.length > 0 && now - entry.fetchedAt < ENTUR_REFRESH_MS) {
    operatorCache.set(operator, entry);
    return entry.data;
  }

  while (
    globalFetchTimestamps.length > 0 &&
    now - globalFetchTimestamps[0] > ENTUR_RATE_LIMIT_WINDOW_MS
  ) {
    globalFetchTimestamps.shift();
  }

  if (globalFetchTimestamps.length >= ENTUR_RATE_LIMIT_MAX) {
    if (entry.data.length > 0) {
      operatorCache.set(operator, entry);
      return entry.data;
    }
    throw new Error("Rate limit reached. Waiting before retrying.");
  }

  globalFetchTimestamps.push(now);

  const inFlight = fetchFromEntur(operator, clientName)
    .then(async (data) => {
      const stops = await loadStops();
      const enriched = data.map((bus) => {
        if (bus.latitude === null || bus.longitude === null) {
          return { ...bus, nearbyStops: [] };
        }
        const nearbyStopsBase = stops.filter((stop) => {
          const distance = distanceInMeters(
            bus.latitude as number,
            bus.longitude as number,
            stop.latitude,
            stop.longitude,
          );
          return distance <= NEARBY_STOP_RADIUS_METERS;
        });
        const nearbyStops: StopInfo[] = [...nearbyStopsBase];

        let destinationStop: StopInfo | null = null;

        if (bus.destinationStopId) {
          destinationStop =
            nearbyStops.find(
              (stop) => stop.id === bus.destinationStopId,
            ) ??
            stops.find((stop) => stop.id === bus.destinationStopId) ??
            null;
          if (
            destinationStop &&
            !nearbyStops.some((stop) => stop.id === destinationStop!.id)
          ) {
            nearbyStops.push(destinationStop);
          }
        }

        if (!destinationStop) {
          const destinationName = bus.destination.toLowerCase();
          if (destinationName && destinationName !== "unknown destination") {
            destinationStop =
              nearbyStops.find(
                (stop) => stop.name.toLowerCase() === destinationName,
              ) ??
              stops.find(
                (stop) => stop.name.toLowerCase() === destinationName,
              ) ??
              null;
            if (
              destinationStop &&
              !nearbyStops.some((stop) => stop.id === destinationStop!.id)
            ) {
              nearbyStops.push(destinationStop);
            }
          }
        }

        if (!destinationStop && nearbyStops.length > 0) {
          destinationStop = nearbyStops[0];
        }

        if (destinationStop) {
          for (let index = 0; index < nearbyStops.length; index += 1) {
            const stop = nearbyStops[index];
            if (stop.id === destinationStop.id) {
              nearbyStops[index] = { ...stop, isDestination: true };
            }
          }
        }
        return { ...bus, nearbyStops };
      });
      operatorCache.set(operator, {
        data: enriched,
        fetchedAt: Date.now(),
        inFlight: null,
      });
      return enriched;
    })
    .catch((error) => {
      operatorCache.set(operator, { ...entry, inFlight: null });
      throw error;
    });

  operatorCache.set(operator, { ...entry, inFlight });
  return inFlight;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const operator = searchParams.get("operator");

  if (!operator) {
    return NextResponse.json(
      { error: "Operator is required." },
      { status: 400 },
    );
  }

  const clientName = process.env.ENTUR_CLIENT_NAME;
  if (!clientName) {
    return NextResponse.json(
      { error: "ENTUR_CLIENT_NAME is not configured." },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      const fetchAndSend = async () => {
        if (request.signal.aborted) {
          return;
        }
        try {
          const availableBuses = await getAvailableBuses(operator, clientName);
          send({
            operator,
            availableBuses,
            updatedAt: new Date().toISOString(),
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Request failed.";
          send({ error: message });
        }
      };

      fetchAndSend();
      intervalId = setInterval(fetchAndSend, ENTUR_REFRESH_MS);

      request.signal.addEventListener("abort", () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        controller.close();
      });
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
