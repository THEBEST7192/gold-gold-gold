"use client";

import type { BusInfo, Player } from "@/app/types";
import { formatDistance } from "@/lib/utils";
import BusMap from "./BusMap";

type BusCardProps = {
  bus: BusInfo;
  distance: number;
  players: Player[];
  raceStarted: boolean;
};

export default function BusCard({ bus, distance, players, raceStarted }: BusCardProps) {
  const betters = players.filter((player) => player.betBusId === bus.id);

  return (
    <article className="rounded-xl border border-amber-900/30 bg-amber-100/70 px-3 py-3 text-sm shadow-inner">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-amber-950">{bus.name}</h2>
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
}
