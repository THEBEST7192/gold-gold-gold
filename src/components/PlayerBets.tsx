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
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      {players.map((player, index) => {
        const bus = buses.find((candidate) => candidate.id === player.betBusId) ?? null;
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
                    entryIndex === index ? { ...entry, name: value } : entry,
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
                    entryIndex === index ? { ...entry, betBusId: value } : entry,
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
                        : `Position ${position} of ${rankedBusesCount}`}
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
                  previous.filter((_entry, entryIndex) => entryIndex !== index),
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
  );
}
