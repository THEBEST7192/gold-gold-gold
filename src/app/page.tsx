"use client";

import type L from "leaflet";
import { useEffect, useRef, useState } from "react";

type StopInfo = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type BusInfo = {
  id: string;
  name: string;
  currentStop: string;
  destination: string;
  latitude: number | null;
  longitude: number | null;
  nearbyStops?: StopInfo[];
};

type BusMapProps = {
  latitude: number;
  longitude: number;
  stops?: StopInfo[];
};

function BusMap({ latitude, longitude, stops }: BusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }
    let isMounted = true;

    const setup = async () => {
      const leafletModule = await import("leaflet");
      const leaflet = leafletModule.default as typeof import("leaflet");
      if (!isMounted || !containerRef.current) {
        return;
      }
      const map = leaflet.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: 14,
        zoomControl: false,
        attributionControl: true,
      });
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        })
        .addTo(map);
      const marker = leaflet
        .circleMarker([latitude, longitude], {
          color: "#92400e",
          fillColor: "#fbbf24",
          fillOpacity: 0.9,
          radius: 8,
        })
        .addTo(map);

      const stopsLayer = leaflet.layerGroup().addTo(map);

      leafletRef.current = leaflet;
      mapRef.current = map;
      markerRef.current = marker;
      stopsLayerRef.current = stopsLayer;
    };

    setup();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
      }
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
      stopsLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) {
      return;
    }
    const center: [number, number] = [latitude, longitude];
    mapRef.current.setView(center);
    markerRef.current.setLatLng(center);
  }, [latitude, longitude]);

  useEffect(() => {
    if (!mapRef.current || !stopsLayerRef.current) {
      return;
    }
    stopsLayerRef.current.clearLayers();
    if (!stops || stops.length === 0) {
      return;
    }
    if (!leafletRef.current) {
      return;
    }
    const leaflet = leafletRef.current;
    stops.forEach((stop) => {
      const stopLatitude = stop.latitude;
      const stopLongitude = stop.longitude;
      if (!Number.isFinite(stopLatitude) || !Number.isFinite(stopLongitude)) {
        return;
      }
      leaflet
        .circleMarker([stopLatitude, stopLongitude], {
          color: "#1e3a8a",
          fillColor: "#93c5fd",
          fillOpacity: 0.9,
          radius: 3,
        })
        .addTo(stopsLayerRef.current as L.LayerGroup);
    });
  }, [stops]);

  return <div ref={containerRef} style={{ height: 180, width: "100%" }} />;
}

export default function Home() {
  const [selectedOperator, setSelectedOperator] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [availableBuses, setAvailableBuses] = useState<BusInfo[]>([]);
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const hasInitialSelectionRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const operators = [
    { code: "AKT", label: "AKT – Agder (AKT)" },
    { code: "ATB", label: "ATB – Trøndelag (AtB)" },
    { code: "BRA", label: "BRA – Viken (Brakar)" },
    { code: "FIN", label: "FIN – Troms og Finnmark (Snelandia)" },
    { code: "GJB", label: "GJB – Vy Gjøvikbanen" },
    { code: "GOA", label: "GOA – Go-Ahead" },
    { code: "INN", label: "INN – Innlandet (Innlandstrafikk)" },
    { code: "KOL", label: "KOL – Rogaland (Kolumbus)" },
    { code: "MOR", label: "MOR – Møre og Romsdal (Fram)" },
    { code: "NBU", label: "NBU – Connect Bus Flybuss" },
    { code: "NOR", label: "NOR – Nordland fylkeskommune" },
    { code: "NSB", label: "NSB – Vy" },
    { code: "OST", label: "OST – Viken (Østfold kollektivtrafikk)" },
    { code: "SKY", label: "SKY – Vestland (Skyss)" },
    { code: "TRO", label: "TRO – Troms og Finnmark (Troms fylkestrafikk)" },
    { code: "VOT", label: "VOT – Vestfold og Telemark" },
    { code: "VYG", label: "VYG – Vy Group" },
    { code: "VYX", label: "VYX – Vy Express" },
  ];

  const formatCoordinate = (value: number | null) =>
    value === null ? "—" : value.toFixed(5);

  const pickRandom = <T,>(items: T[], count: number): T[] => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy.slice(0, count);
  };

  const getUniqueBuses = (items: BusInfo[]) =>
    Array.from(new Map(items.map((bus) => [bus.id, bus])).values());

  useEffect(() => {
    if (!selectedOperator) {
      return;
    }
    setTrackedIds([]);
    setAvailableBuses([]);
    hasInitialSelectionRef.current = false;
  }, [selectedOperator]);

  useEffect(() => {
    if (!selectedOperator) {
      setAvailableBuses([]);
      setTrackedIds([]);
      setErrorMessage("");
      setLastUpdated("");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setLastUpdated("");

    const eventSource = new EventSource(
      `/api/entur?operator=${selectedOperator}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          availableBuses?: BusInfo[];
          updatedAt?: string;
          error?: string;
        };
        if (payload.error) {
          setErrorMessage(payload.error);
          setAvailableBuses([]);
          setTrackedIds([]);
          setIsLoading(false);
          return;
        }
        const incomingAvailable = getUniqueBuses(payload.availableBuses ?? []);
        setAvailableBuses(incomingAvailable);

        if (!hasInitialSelectionRef.current) {
          if (incomingAvailable.length === 0) {
          } else {
            const initial = pickRandom(incomingAvailable, 5);
            hasInitialSelectionRef.current = true;
            setTrackedIds(initial.map((bus) => bus.id));
          }
        }
        setLastUpdated(payload.updatedAt ?? "");
        setErrorMessage("");
        setIsLoading(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to parse stream.";
        setErrorMessage(message);
        setIsLoading(false);
      }
    };

    eventSource.onerror = () => {
      setErrorMessage("Stream disconnected.");
      setIsLoading(false);
    };

    return () => {
      eventSource.close();
    };
  }, [selectedOperator]);

  const buses = availableBuses.filter((bus) => trackedIds.includes(bus.id));

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50 bg-[radial-gradient(circle_at_top,_#fef3c7,_#fbbf24_40%,_#78350f_120%)] font-serif">
      <main className="w-full max-w-5xl rounded-2xl border-4 border-amber-900 bg-amber-50/90 px-8 py-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <div className="mb-8 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-800">
            Grand Bus Derby
          </p>
          <h1 className="text-3xl font-extrabold tracking-wide text-amber-950">
            Pick Your Race Zone
          </h1>
          <p className="text-sm italic text-amber-900/80">
            Choose a zone and we&apos;ll draw five random buses for today&apos;s race.
          </p>
        </div>

        <div className="space-y-3">
          <label
            htmlFor="operator"
            className="block text-sm font-semibold uppercase tracking-[0.25em] text-amber-900"
          >
            Race zone
          </label>
          <div className="relative inline-block w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">
                Zone
              </span>
            </div>
            <select
              id="operator"
              value={selectedOperator}
              onMouseDown={() => setIsSelectOpen(true)}
              onBlur={() => setIsSelectOpen(false)}
              onChange={(event) => {
                setSelectedOperator(event.target.value);
                setIsSelectOpen(false);
              }}
              className="block h-12 w-full appearance-none rounded-md border border-amber-900/80 bg-amber-100/80 py-2 pl-20 pr-8 text-sm font-medium text-amber-950 shadow-inner outline-none transition duration-150 ease-out focus:border-amber-900 focus:ring-2 focus:ring-amber-700/40"
            >
              <option value="">Select a zone to start the race</option>
              {operators.map((operator) => (
                <option key={operator.code} value={operator.code}>
                  {operator.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
              <span
                className={`text-xs font-bold text-amber-900 transition-transform duration-150 ${
                  isSelectOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-amber-900/80">
          {selectedOperator
            ? `Zone ${selectedOperator} is set – five random buses will enter the race.`
            : "Select a zone to draw five random buses for today´s race"}
        </p>

        {selectedOperator ? (
          <section className="mt-8 space-y-4 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-900/80">
              <span>Live buses</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const options = getUniqueBuses(availableBuses);
                    if (options.length === 0) {
                      return;
                    }
                    const nextBuses = pickRandom(options, 5);
                    setTrackedIds(nextBuses.map((bus) => bus.id));
                  }}
                  className="rounded-full border border-amber-900/40 bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-900 transition hover:bg-amber-200"
                  disabled={availableBuses.length === 0}
                >
                  Shuffle buses
                </button>
                <span>
                  {lastUpdated
                    ? `Updated ${new Date(lastUpdated).toLocaleTimeString(
                        "nb-NO",
                        { hour12: false },
                      )}`
                    : "Waiting for update"}
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-amber-900/30 bg-amber-100/70 px-3 py-4 text-xs text-amber-900">
                Fetching the starting grid...
              </div>
            ) : errorMessage ? (
              <div className="rounded-xl border border-amber-900/30 bg-amber-100/70 px-3 py-4 text-xs text-amber-900">
                {errorMessage}
              </div>
            ) : buses.length === 0 ? (
              <div className="rounded-xl border border-amber-900/30 bg-amber-100/70 px-3 py-4 text-xs text-amber-900">
                {trackedIds.length === 0
                  ? "Waiting for buses in this zone."
                  : "No buses available in this zone right now."}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {buses.map((bus) => (
                  <article
                    key={bus.id}
                    className="rounded-xl border border-amber-900/30 bg-amber-100/70 px-3 py-3 text-xs shadow-inner"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-amber-950">
                        {bus.name}
                      </h2>
                    </div>
                    <div className="mt-2 space-y-2 text-[11px] text-amber-900">
                      <div>
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                          Current stop
                        </span>
                        <span className="block text-sm font-medium text-amber-950">
                          {bus.currentStop}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                          Destination
                        </span>
                        <span className="block text-sm font-medium text-amber-950">
                          {bus.destination}
                        </span>
                      </div>
                    </div>
                    {bus.latitude !== null && bus.longitude !== null ? (
                      <div className="mt-3 overflow-hidden rounded-xl border border-amber-900/30">
                        <BusMap
                          latitude={bus.latitude}
                          longitude={bus.longitude}
                          stops={bus.nearbyStops}
                        />
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-amber-900/20 bg-amber-100/80 px-3 py-2 text-xs text-amber-900">
                        No coordinates available for this bus.
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
