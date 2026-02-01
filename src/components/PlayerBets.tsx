"use client";

import type { BusInfo, Player } from "@/app/types";

type PlayerBetsProps = {
  players: Player[];
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  buses: BusInfo[];
  raceStarted: boolean;
  betFinished: boolean;
  positionByBusId: Record<string, number>;
  rankedBusesCount: number;
};

export default function PlayerBets({
  players,
  setPlayers,
  buses,
  raceStarted,
  betFinished,
  positionByBusId,
  rankedBusesCount,
}: PlayerBetsProps) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {players.map((player, index) => {
        const bus = buses.find((candidate) => candidate.id === player.betBusId) ?? null;
        const position =
          bus && player.betBusId in positionByBusId
            ? positionByBusId[player.betBusId] + 1
            : null;

        const statusText =
          raceStarted || betFinished ? (
            bus ? (
              position ? (
                `#${position} of ${rankedBusesCount}`
              ) : (
                "Not in race"
              )
            ) : (
              "No bet"
            )
          ) : (
            "Waiting..."
          );

        return (
          <div
            key={player.id}
            className="relative flex flex-col gap-3 rounded-xl border border-amber-900/20 bg-amber-100/40 p-3.5 shadow-sm transition-all hover:shadow-md"
          >
            {/* Header: Name and Close button */}
            <div className="flex items-center gap-2">
              <input
                value={player.name}
                onChange={(event) => {
                  const value = event.target.value;
                  setPlayers((previous) =>
                    previous.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, name: value } : entry,
                    ),
                  );
                }}
                className="h-8 w-full rounded-lg border border-amber-900/20 bg-amber-50 px-3 text-sm font-bold text-amber-950 shadow-inner outline-none focus:border-amber-500 focus:bg-amber-50"
              />
              <button
                type="button"
                onClick={() => {
                  setPlayers((previous) =>
                    previous.filter((_entry, entryIndex) => entryIndex !== index),
                  );
                }}
                disabled={players.length <= 1}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-900/20 bg-amber-50 text-amber-900 shadow-sm transition-all hover:bg-amber-100 disabled:opacity-30"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            {/* Betting section */}
            <div className="space-y-1 text-left">
              <label className="block text-[0.6rem] font-black uppercase tracking-widest text-amber-800">
                Betting on
              </label>
              <div className="relative">
                <select
                  value={player.betBusId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPlayers((previous) =>
                      previous.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, betBusId: value } : entry,
                      ),
                    );
                  }}
                  className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-amber-900/20 bg-amber-50 px-3 text-sm font-medium text-amber-950 shadow-inner outline-none focus:border-amber-500 focus:bg-amber-50"
                >
                  <option value="">No bet</option>
                  {buses.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-amber-900/40">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Status section */}
            <div className="flex items-center justify-between border-t border-amber-900/10 pt-2 text-left">
              <span className="text-[0.6rem] font-black uppercase tracking-widest text-amber-800">
                Status
              </span>
              <span className="text-xs font-bold text-amber-900">
                {statusText}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
