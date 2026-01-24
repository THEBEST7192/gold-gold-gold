"use client";

import { useState } from "react";

type Operator = {
  code: string;
  label: string;
};

type RaceSetupProps = {
  selectedOperator: string;
  setSelectedOperator: (code: string) => void;
  busCount: number;
  setBusCount: (count: number) => void;
  raceStarted: boolean;
  operators: Operator[];
  isSelectOpen: boolean;
  setIsSelectOpen: (open: boolean) => void;
};

export default function RaceSetup({
  selectedOperator,
  setSelectedOperator,
  busCount,
  setBusCount,
  raceStarted,
  operators,
  isSelectOpen,
  setIsSelectOpen,
}: RaceSetupProps) {
  const [isBusSelectOpen, setIsBusSelectOpen] = useState(false);

  return (
    <>
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-800">
          Grand Bus Derby
        </p>
        <h1 className="text-3xl font-extrabold tracking-wide text-amber-950">
          Pick Your Race Zone
        </h1>
        <p className="text-sm italic text-amber-900/80">
          {`Choose a zone and we'll draw ${busCount} random bus${
            busCount === 1 ? "" : "es"
          } for today's race.`}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-center gap-3">
          <div className="min-w-[16rem]">
            <label
              htmlFor="operator"
              className="block text-sm font-semibold uppercase tracking-[0.25em] text-amber-900"
            >
              Race zone
            </label>
            <div className="relative mt-1 inline-block w-full">
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
          <div className="w-auto">
            <label className="block text-sm font-semibold uppercase tracking-[0.25em] text-amber-900">
              Buses in race
            </label>
            <div className="relative mt-1">
              <select
                value={busCount}
                onMouseDown={() => setIsBusSelectOpen(true)}
                onBlur={() => setIsBusSelectOpen(false)}
                onChange={(event) => {
                  setBusCount(Number(event.target.value));
                  setIsBusSelectOpen(false);
                }}
                disabled={raceStarted}
                className="h-12 min-w-[8rem] w-full appearance-none rounded-md border border-amber-900/80 bg-amber-100/80 px-4 pr-10 text-base font-medium text-amber-950 shadow-inner outline-none transition duration-150 ease-out focus:border-amber-900 focus:ring-2 focus:ring-amber-700/40 disabled:opacity-40"
              >
                {Array.from({ length: 12 }, (_unused, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                <span
                  className={`text-xs font-bold text-amber-900 transition-transform duration-150 ${
                    isBusSelectOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-amber-900/80">
        {selectedOperator
          ? `Zone ${selectedOperator} is set – ${busCount} random bus${
              busCount === 1 ? "" : "es"
            } will enter the race.`
          : `Select a zone to draw ${busCount} random bus${
              busCount === 1 ? "" : "es"
            } for today´s race`}
      </p>
    </>
  );
}
