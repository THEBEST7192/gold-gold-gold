"use client";

import { useState } from "react";

export default function Home() {
  const [selectedOperator, setSelectedOperator] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const operators = [
    { code: "AKT", label: "AKT – Agder (AKT)" },
    { code: "ATB", label: "ATB – Trøndelag (AtB)" },
    { code: "AVI", label: "AVI – Avinor" },
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
    { code: "VYB", label: "VYB – Vy Buss (SE)" },
    { code: "VYG", label: "VYG – Vy Group" },
    { code: "VYX", label: "VYX – Vy Express" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50 bg-[radial-gradient(circle_at_top,_#fef3c7,_#fbbf24_40%,_#78350f_120%)] font-serif">
      <main className="w-full max-w-2xl rounded-2xl border-4 border-amber-900 bg-amber-50/90 px-10 py-10 text-center shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
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
      </main>
    </div>
  );
}
