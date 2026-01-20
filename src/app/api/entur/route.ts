import { NextResponse } from "next/server";

const ENTUR_VM_ENDPOINT = "https://api.entur.io/realtime/v1/rest/vm";

type BusInfo = {
  id: string;
  name: string;
  currentStop: string;
  destination: string;
  latitude: number | null;
  longitude: number | null;
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

  return activities
    .map((activity, index) => {
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

      const destination =
        normalizeText(journey.DestinationName) ||
        normalizeText(journey.DestinationRef) ||
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

      return {
        id,
        name,
        currentStop,
        destination,
        latitude,
        longitude,
      };
    })
    .filter((entry): entry is BusInfo => Boolean(entry));
};

const getAvailableBuses = async (operator: string, clientName: string) => {
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
      intervalId = setInterval(fetchAndSend, 15000);

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
