"use client";

import Link from "next/link";
import type { CorrelationSignal } from "@/lib/correlations/types";

const DIRECTION_LABELS: Record<CorrelationSignal["direction"], string> = {
  up: "Up",
  down: "Down",
  flat: "Flat",
  unknown: "Unknown",
};

const DIRECTION_CLASS: Record<CorrelationSignal["direction"], string> = {
  up: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  down: "border-red-500/30 bg-red-500/10 text-red-100",
  flat: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
  unknown: "border-zinc-600/30 bg-zinc-700/10 text-zinc-300",
};

export function CorrelationSignalRow({ signal }: { signal: CorrelationSignal }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">{signal.label}</p>
        <p className="mt-1 truncate text-sm font-medium text-white">{signal.value}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
          {signal.source}
        </p>
      </div>
      <span
        className={`inline-flex shrink-0 self-start rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${DIRECTION_CLASS[signal.direction]}`}
      >
        {DIRECTION_LABELS[signal.direction]}
      </span>
    </div>
  );
}

export function CorrelationSignalChips({ signals }: { signals: CorrelationSignal[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {signals.map((entry) => (
        <span
          key={`${entry.label}-${entry.source}`}
          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${DIRECTION_CLASS[entry.direction]}`}
        >
          {entry.label}: {entry.value}
        </span>
      ))}
    </div>
  );
}

export function CorrelationRelatedRoutes({ routes }: { routes: string[] }) {
  if (routes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {routes.map((route) => (
        <Link
          key={route}
          href={route}
          className="rounded-lg border border-[#b4141e]/25 bg-[#b4141e]/5 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[#f1c3c7] transition hover:bg-[#b4141e]/10"
        >
          {route.replace("/admin/nexus/", "").replaceAll("-", " ")}
        </Link>
      ))}
    </div>
  );
}
