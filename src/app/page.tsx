"use client";

import type L from "leaflet";
import { useEffect, useRef, useState } from "react";

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

type Player = {
  id: string;
  name: string;
  betBusId: string;
};

type BusMapProps = {
  latitude: number;
  longitude: number;
  stops?: StopInfo[];
   trackEnabled: boolean;
};

function BusMap({ latitude, longitude, stops, trackEnabled }: BusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);

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

      const stopsLayer = leaflet.layerGroup().addTo(map);

      const trail = leaflet
        .polyline([], {
          color: "#b91c1c",
          weight: 3,
          opacity: 0.9,
          dashArray: "6 4",
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

      leafletRef.current = leaflet;
      mapRef.current = map;
      markerRef.current = marker;
      stopsLayerRef.current = stopsLayer;
      trailRef.current = trail;
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
      trailRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) {
      return;
    }
    const center: [number, number] = [latitude, longitude];
    mapRef.current.setView(center);
    markerRef.current.setLatLng(center);
    if (trailRef.current && trackEnabled) {
      trailRef.current.addLatLng([latitude, longitude]);
    }
    markerRef.current.bringToFront();
  }, [latitude, longitude, trackEnabled]);

  useEffect(() => {
    if (!trailRef.current) {
      return;
    }
    if (trackEnabled) {
      trailRef.current.setLatLngs([]);
    }
  }, [trackEnabled]);

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
    const destinationIcon = leaflet.divIcon({
      className: "",
      html: "🚩",
      iconSize: [16, 16],
      iconAnchor: [8, 16],
    });
    stops.forEach((stop) => {
      const stopLatitude = stop.latitude;
      const stopLongitude = stop.longitude;
      if (!Number.isFinite(stopLatitude) || !Number.isFinite(stopLongitude)) {
        return;
      }
      if (stop.isDestination) {
        leaflet
          .marker([stopLatitude, stopLongitude], {
            icon: destinationIcon,
          })
          .addTo(stopsLayerRef.current as L.LayerGroup);
      } else {
        leaflet
          .circleMarker([stopLatitude, stopLongitude], {
            color: "#1e3a8a",
            fillColor: "#93c5fd",
            fillOpacity: 0.9,
            radius: 3,
          })
          .addTo(stopsLayerRef.current as L.LayerGroup);
      }
    });
    if (markerRef.current) {
      markerRef.current.bringToFront();
    }
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
  const [busStats, setBusStats] = useState<
    Record<
      string,
      { distance: number; lastLatitude: number | null; lastLongitude: number | null }
    >
  >({});
  const [raceStarted, setRaceStarted] = useState(false);
  const [betDurationMinutes, setBetDurationMinutes] = useState(5);
  const [betEndTime, setBetEndTime] = useState<number | null>(null);
  const [betRemainingSeconds, setBetRemainingSeconds] = useState<number | null>(
    null,
  );
  const [betFinished, setBetFinished] = useState(false);
  const [players, setPlayers] = useState<Player[]>([
    { id: "1", name: "Player 1", betBusId: "" },
    { id: "2", name: "Player 2", betBusId: "" },
  ]);

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

  const formatDistance = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      return "0 m";
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)} km`;
    }
    return `${Math.round(value)} m`;
  };

  const formatRemainingSeconds = (value: number | null) => {
    if (value === null) {
      return "";
    }
    if (value <= 0) {
      return "0s";
    }
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    if (minutes <= 0) {
      return `${seconds}s`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

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

  const toRadians = (value: number) => (value * Math.PI) / 180;

  const distanceInMeters = (
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number,
  ) => {
    const earthRadius = 6371000;
    const latitudeDifference = toRadians(latitudeB - latitudeA);
    const longitudeDifference = toRadians(longitudeB - longitudeA);
    const a =
      Math.sin(latitudeDifference / 2) * Math.sin(latitudeDifference / 2) +
      Math.cos(toRadians(latitudeA)) *
        Math.cos(toRadians(latitudeB)) *
        Math.sin(longitudeDifference / 2) *
        Math.sin(longitudeDifference / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  };

  useEffect(() => {
    if (!selectedOperator) {
      return;
    }
    setTrackedIds([]);
    setAvailableBuses([]);
    hasInitialSelectionRef.current = false;
    setBusStats({});
    setRaceStarted(false);
    setBetEndTime(null);
    setBetRemainingSeconds(null);
    setBetFinished(false);
    setPlayers((previous) =>
      previous.map((player) => ({ ...player, betBusId: "" })),
    );
  }, [selectedOperator]);

  useEffect(() => {
    if (!raceStarted) {
      return;
    }
    setBusStats((previous) => {
      const next = { ...previous };
      availableBuses.forEach((bus) => {
        if (bus.latitude === null || bus.longitude === null) {
          return;
        }
        const latitude = bus.latitude;
        const longitude = bus.longitude;
        const existing = next[bus.id];
        if (
          !existing ||
          existing.lastLatitude === null ||
          existing.lastLongitude === null
        ) {
          next[bus.id] = {
            distance: existing ? existing.distance : 0,
            lastLatitude: latitude,
            lastLongitude: longitude,
          };
          return;
        }
        const delta = distanceInMeters(
          existing.lastLatitude,
          existing.lastLongitude,
          latitude,
          longitude,
        );
        const safeDelta = Number.isFinite(delta) ? Math.max(delta, 0) : 0;
        next[bus.id] = {
          distance: existing.distance + safeDelta,
          lastLatitude: latitude,
          lastLongitude: longitude,
        };
      });
      return next;
    });
  }, [availableBuses, raceStarted]);

  useEffect(() => {
    if (!raceStarted || !betEndTime) {
      return;
    }

    const updateRemaining = () => {
      const remainingMilliseconds = betEndTime - Date.now();
      if (remainingMilliseconds <= 0) {
        setRaceStarted(false);
        setBetEndTime(null);
        setBetRemainingSeconds(0);
        setBetFinished(true);
        return;
      }
      const nextSeconds = Math.ceil(remainingMilliseconds / 1000);
      setBetRemainingSeconds(nextSeconds);
    };

    updateRemaining();
    const identifier = setInterval(updateRemaining, 1000);

    return () => {
      clearInterval(identifier);
    };
  }, [raceStarted, betEndTime]);

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

  const rankedBuses = buses
    .map((bus) => ({
      bus,
      distance: busStats[bus.id]?.distance ?? 0,
    }))
    .sort((first, second) => second.distance - first.distance);

  const leader = rankedBuses[0]?.bus;

  const positionByBusId: Record<string, number> = {};
  rankedBuses.forEach((entry, index) => {
    positionByBusId[entry.bus.id] = index;
  });

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
                    setBusStats({});
                    setPlayers((previous) =>
                      previous.map((player) => ({ ...player, betBusId: "" })),
                    );
                    setRaceStarted(false);
                  }}
                  className="rounded-full border border-amber-900/40 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-900 transition hover:bg-amber-200"
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

            {buses.length > 0 ? (
              <div className="rounded-xl border border-amber-900/40 bg-amber-100/70 px-3 py-3 text-sm text-amber-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-800">
                      Players and bets
                    </p>
                    <p className="text-sm">
                      Each player chooses one of the five buses. The leader is the one
                      that has traveled the longest distance while you watch.
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {leader ? (
                      <p>
                        Leader:{" "}
                        <span className="font-semibold text-amber-950">
                          {leader.name}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-900/80">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      {raceStarted
                        ? "Bet running"
                        : betFinished
                          ? "Bet finished"
                          : "Bet not started"}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-[0.65rem]">
                      <span className="tracking-[0.2em] text-amber-900/80">
                        Bet length
                      </span>
                      <select
                        value={betDurationMinutes}
                        onChange={(event) =>
                          setBetDurationMinutes(Number(event.target.value))
                        }
                        disabled={raceStarted}
                        className="h-7 rounded border border-amber-900/40 bg-amber-50 px-2 text-[0.7rem] font-medium text-amber-950 shadow-inner outline-none disabled:opacity-40"
                      >
                        <option value={2}>2 min</option>
                        <option value={5}>5 min</option>
                        <option value={10}>10 min</option>
                        <option value={30}>30 min</option>
                      </select>
                    </div>
                    {betRemainingSeconds !== null ? (
                      <span className="text-[0.65rem] font-semibold tracking-[0.2em] text-amber-900/80">
                        {betRemainingSeconds <= 0
                          ? "Bet finished"
                          : `Time left: ${formatRemainingSeconds(betRemainingSeconds)}`}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBusStats(() => {
                          const next: Record<
                            string,
                            {
                              distance: number;
                              lastLatitude: number | null;
                              lastLongitude: number | null;
                            }
                          > = {};
                          availableBuses.forEach((bus) => {
                            if (bus.latitude === null || bus.longitude === null) {
                              return;
                            }
                            next[bus.id] = {
                              distance: 0,
                              lastLatitude: bus.latitude,
                              lastLongitude: bus.longitude,
                            };
                          });
                          return next;
                        });
                        const now = Date.now();
                        const durationMilliseconds = betDurationMinutes * 60 * 1000;
                        setBetEndTime(now + durationMilliseconds);
                        setBetRemainingSeconds(
                          Math.max(Math.floor(durationMilliseconds / 1000), 0),
                        );
                        setBetFinished(false);
                        setRaceStarted(true);
                      }}
                      disabled={raceStarted || buses.length === 0}
                      className="rounded-full border border-amber-900/40 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-900 shadow-inner transition hover:bg-amber-200 disabled:opacity-40"
                    >
                      {raceStarted ? "Bet running" : "Start bet"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRaceStarted(false);
                        setBetEndTime(null);
                        setBetRemainingSeconds(0);
                        setBetFinished(true);
                      }}
                      disabled={!raceStarted}
                      className="rounded-full border border-amber-900/40 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-900 shadow-inner transition hover:bg-amber-200 disabled:opacity-40"
                    >
                      Stop bet
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {players.map((player, index) => {
                    const bus =
                      buses.find((candidate) => candidate.id === player.betBusId) ??
                      null;
                    const position =
                      bus && player.betBusId in positionByBusId
                        ? positionByBusId[player.betBusId] + 1
                        : null;
                    return (
                      <div
                        key={player.id}
                        className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto] items-center gap-2"
                      >
                        <input
                          value={player.name}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPlayers((previous) =>
                              previous.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, name: value }
                                  : entry,
                              ),
                            );
                          }}
                          className="h-7 rounded border border-amber-900/40 bg-amber-50 px-2 text-sm font-medium text-amber-950 shadow-inner outline-none"
                        />
                        <select
                          value={player.betBusId}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPlayers((previous) =>
                              previous.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, betBusId: value }
                                  : entry,
                              ),
                            );
                          }}
                          className="h-7 w-full rounded border border-amber-900/40 bg-amber-50 px-2 text-sm text-amber-950 shadow-inner outline-none"
                        >
                          <option value="">No bet</option>
                          {buses.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </option>
                          ))}
                        </select>
                        <div className="text-sm">
                          {raceStarted || betFinished ? (
                            bus ? (
                              position ? (
                                <span>
                                  {position === 1
                                    ? "Leading"
                                    : `Position ${position} of ${
                                        rankedBuses.length
                                      }`}
                                </span>
                              ) : (
                                <span>Bus not in race</span>
                              )
                            ) : (
                              <span>No bus selected</span>
                            )
                          ) : (
                            <span>Bet not started</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPlayers((previous) =>
                              previous.filter(
                                (_entry, entryIndex) => entryIndex !== index,
                              ),
                            );
                          }}
                          disabled={players.length <= 1}
                          className="h-7 w-7 rounded-full border border-amber-900/40 bg-amber-50 text-xs font-semibold text-amber-900 shadow-inner transition hover:bg-amber-200 disabled:opacity-40"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                {players.length < 6 ? (
                  <div className="mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPlayers((previous) => {
                          const identifier = String(previous.length + 1);
                          return [
                            ...previous,
                            {
                              id: identifier,
                              name: `Player ${identifier}`,
                              betBusId: "",
                            },
                          ];
                        });
                      }}
                      className="rounded-full border border-amber-900/40 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-900 transition hover:bg-amber-200"
                    >
                      Add player
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-xl border border-amber-900/30 bg-amber-100/70 px-3 py-4 text-sm text-amber-900">
                Fetching the starting grid...
              </div>
            ) : errorMessage ? (
              <div className="rounded-xl border border-amber-900/30 bg-amber-100/70 px-3 py-4 text-sm text-amber-900">
                {errorMessage}
              </div>
            ) : buses.length === 0 ? (
              <div className="rounded-xl border border-amber-900/30 bg-amber-100/70 px-3 py-4 text-sm text-amber-900">
                {trackedIds.length === 0
                  ? "Waiting for buses in this zone."
                  : "No buses available in this zone right now."}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {buses.map((bus) => {
                  const distance = busStats[bus.id]?.distance ?? 0;
                  const betters = players.filter(
                    (player) => player.betBusId === bus.id,
                  );
                  return (
                    <article
                      key={bus.id}
                      className="rounded-xl border border-amber-900/30 bg-amber-100/70 px-3 py-3 text-sm shadow-inner"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-amber-950">
                          {bus.name}
                        </h2>
                      </div>
                      <div className="mt-2 space-y-2 text-sm text-amber-900">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                              Current stop
                            </span>
                            <span className="block text-sm font-medium text-amber-950">
                              {bus.currentStop}
                            </span>
                          </div>
                          <div className="ml-auto w-1/2 text-right">
                            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                              Betters
                            </span>
                            <span className="mt-1 block text-sm font-medium text-amber-950">
                              {betters.length > 0
                                ? betters.map((player) => player.name).join(", ")
                                : "None"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                              Destination
                            </span>
                            <span className="block text-sm font-medium text-amber-950">
                              {bus.destination}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                              Distance
                            </span>
                            <span className="block text-sm font-medium text-amber-950">
                              {formatDistance(distance)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {bus.latitude !== null && bus.longitude !== null ? (
                        <div className="mt-3 overflow-hidden rounded-xl border border-amber-900/30">
                          <BusMap
                            latitude={bus.latitude}
                            longitude={bus.longitude}
                            stops={bus.nearbyStops}
                            trackEnabled={raceStarted}
                          />
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-amber-900/20 bg-amber-100/80 px-3 py-2 text-sm text-amber-900">
                          No coordinates available for this bus.
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
