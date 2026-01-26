"use client";

import { useEffect, useRef, useState } from "react";
import type { BusInfo, BusStats, Player } from "@/app/types";
import {
  distanceInMeters,
  formatRemainingSeconds,
  getUniqueBuses,
  pickRandom,
} from "@/lib/utils";
import BusCard from "@/components/BusCard";
import PlayerBets from "@/components/PlayerBets";
import RaceSetup from "@/components/RaceSetup";

export default function Home() {
  const [selectedOperator, setSelectedOperator] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [availableBuses, setAvailableBuses] = useState<BusInfo[]>([]);
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const hasInitialSelectionRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [busStats, setBusStats] = useState<BusStats>({});
  const [raceStarted, setRaceStarted] = useState(false);
  const [busCount, setBusCount] = useState(6);
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
  const mainRef = useRef<HTMLDivElement | null>(null);
  const [embedWidth, setEmbedWidth] = useState(0);
  const [embedVideoWidth, setEmbedVideoWidth] = useState(0);
  const [leftStart, setLeftStart] = useState(0);
  const [rightStart, setRightStart] = useState(0);

  // Compute dynamic width for side embeds to occupy leftover space
  useEffect(() => {
    const updateWidth = () => {
      const mainEl = mainRef.current;
      if (!mainEl) {
        setEmbedWidth(0);
        setEmbedVideoWidth(window.innerHeight * (16 / 9));
        return;
      }
      const mainWidth = mainEl.offsetWidth;
      const viewportWidth = window.innerWidth;
      const leftover = Math.max((viewportWidth - mainWidth) / 2, 0);
      setEmbedWidth(leftover);
      setEmbedVideoWidth(window.innerHeight * (16 / 9));
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  useEffect(() => {
    if (raceStarted) {
      const videoSeconds = 10 * 60 * 60;
      setLeftStart(Math.floor(Math.random() * videoSeconds));
      setRightStart(Math.floor(Math.random() * videoSeconds));
    } else {
      setLeftStart(0);
      setRightStart(0);
    }
  }, [raceStarted]);

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
            const initial = pickRandom(incomingAvailable, busCount);
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

  useEffect(() => {
    if (!selectedOperator || !hasInitialSelectionRef.current || raceStarted || availableBuses.length === 0) {
      return;
    }
    const options = getUniqueBuses(availableBuses);
    if (options.length === 0) {
      return;
    }
    const count = Math.min(busCount, options.length);
    if (count <= 0) {
      return;
    }
    const nextBuses = pickRandom(options, count);
    setTrackedIds(nextBuses.map((bus) => bus.id));
    setBusStats({});
    setPlayers((previous) =>
      previous.map((player) => ({ ...player, betBusId: "" })),
    );
  }, [busCount]);

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
      {/* Subway Surfers embeds shown during active bet on both sides */}
      {raceStarted ? (
        <>
          <aside
            className="fixed left-0 top-0 z-10 h-screen overflow-hidden pointer-events-none"
            style={{ width: embedWidth }}
          >
            <iframe
              title="Subway Surfers Left"
              className="h-screen"
              src={`https://www.youtube.com/embed/eRXE8Aebp7s?autoplay=1&mute=1&loop=1&playlist=eRXE8Aebp7s&start=${leftStart}`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{
                width: `${embedVideoWidth}px`,
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                border: "none",
              }}
            />
          </aside>
          <aside
            className="fixed right-0 top-0 z-10 h-screen overflow-hidden pointer-events-none"
            style={{ width: embedWidth }}
          >
            <iframe
              title="Subway Surfers Right"
              className="h-screen"
              src={`https://www.youtube.com/embed/eRXE8Aebp7s?autoplay=1&mute=1&loop=1&playlist=eRXE8Aebp7s&start=${rightStart}`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{
                width: `${embedVideoWidth}px`,
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                border: "none",
              }}
            />
          </aside>
        </>
      ) : null}
      <main
        ref={mainRef}
        className="w-full max-w-5xl rounded-2xl border-4 border-amber-900 bg-amber-50/90 px-8 py-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.4)]"
      >
        <RaceSetup
          selectedOperator={selectedOperator}
          setSelectedOperator={setSelectedOperator}
          busCount={busCount}
          setBusCount={setBusCount}
          raceStarted={raceStarted}
          operators={operators}
          isSelectOpen={isSelectOpen}
          setIsSelectOpen={setIsSelectOpen}
        />

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
                    const count = Math.min(busCount, options.length);
                    if (count <= 0) {
                      return;
                    }
                    const nextBuses = pickRandom(options, count);
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
                      Each player chooses one of the {busCount} buses. The leader is
                      the one that has traveled the longest distance while you watch.
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
                          const next: BusStats = {};
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
                
                <PlayerBets
                  players={players}
                  setPlayers={setPlayers}
                  buses={buses}
                  raceStarted={raceStarted}
                  betFinished={betFinished}
                  positionByBusId={positionByBusId}
                  rankedBusesCount={rankedBuses.length}
                />

                {players.length < 12 ? (
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
                {buses.map((bus) => (
                  <BusCard
                    key={bus.id}
                    bus={bus}
                    distance={busStats[bus.id]?.distance ?? 0}
                    players={players}
                    raceStarted={raceStarted}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
