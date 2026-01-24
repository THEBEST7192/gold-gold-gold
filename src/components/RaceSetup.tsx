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

type SetupSelectProps = {
  label: string;
  id?: string;
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  children: React.ReactNode;
  prefixLeft?: string;
  containerClass?: string;
  minWidthClass?: string;
};

function SetupSelect({
  label,
  id,
  value,
  onChange,
  disabled,
  isOpen,
  setIsOpen,
  children,
  prefixLeft,
  containerClass,
  minWidthClass,
}: SetupSelectProps) {
  return (
    <div className={containerClass ?? ""}>
      <label className="block text-sm font-semibold uppercase tracking-[0.25em] text-amber-900">
        {label}
      </label>
      <div className="relative mt-1 inline-block w-full">
        {prefixLeft && (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">
              {prefixLeft}
            </span>
          </div>
        )}
        <select
          id={id}
          value={value}
          onMouseDown={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(false);
          }}
          disabled={disabled}
          className={`block h-12 w-full appearance-none rounded-md border border-amber-900/80 bg-amber-100/80 text-sm font-medium text-amber-950 shadow-inner outline-none transition duration-150 ease-out focus:border-amber-900 focus:ring-2 focus:ring-amber-700/40 disabled:opacity-40 ${
            prefixLeft ? "py-2 pl-20 pr-8" : "px-3 pr-8"
          } ${minWidthClass ?? ""}`}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <span
            className={`text-xs font-bold text-amber-900 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </div>
      </div>
    </div>
  );
}

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
          <SetupSelect
            label="Race zone"
            id="operator"
            value={selectedOperator}
            onChange={(value) => setSelectedOperator(value)}
            isOpen={isSelectOpen}
            setIsOpen={setIsSelectOpen}
            prefixLeft="Zone"
            containerClass="min-w-[16rem]"
          >
            <option value="">Select a zone to start the race</option>
            {operators.map((operator) => (
              <option key={operator.code} value={operator.code}>
                {operator.label}
              </option>
            ))}
          </SetupSelect>

          <SetupSelect
            label="Buses in race"
            value={busCount}
            onChange={(value) => setBusCount(Number(value))}
            disabled={raceStarted}
            isOpen={isBusSelectOpen}
            setIsOpen={setIsBusSelectOpen}
            containerClass="w-auto"
            minWidthClass="min-w-[8rem]"
          >
            {Array.from({ length: 12 }, (_unused, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </SetupSelect>
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
