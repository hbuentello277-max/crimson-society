"use client";

import { memo, useState } from "react";
import type { NavigationMetrics, NavigationSession } from "@/lib/meets/navigation/types";

type NavigationHudProps = {
  session: NavigationSession;
  onRecenter: () => void;
  onRetryGps: () => void;
  onTogglePause: () => void;
  canRecenter: boolean;
};

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}

function NavigationHudComponent({
  session,
  onRecenter,
  onRetryGps,
  onTogglePause,
  canRecenter,
}: NavigationHudProps) {
  const [expanded, setExpanded] = useState(false);
  const { metrics, meet, route, navigationState, error, shareError, isPaused } = session;

  const showGpsAlert =
    navigationState === "gps_permission_required" ||
    navigationState === "error" ||
    !!error;

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+8px)] z-[600] sm:inset-x-4">
      <div className="pointer-events-auto mx-auto max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black/82 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {expanded ? (
          <div className="border-b border-white/8 px-3 py-3">
            {route && meet ? (
              <p className="truncate text-[10px] leading-5 text-zinc-400">
                <span className="text-zinc-300">●</span> {route.meetPoint}
                <span className="mx-1.5 text-zinc-600">→</span>
                <span className="text-[#f6d58b]">★</span> {route.destination}
              </p>
            ) : null}

            <ExpandedMetrics metrics={metrics} />

            {showGpsAlert ? (
              <div className="mt-2 rounded-lg border border-[#b4141e]/50 bg-[#10080a]/90 px-3 py-2 text-xs leading-5 text-[#f0c9ce]">
                {error ?? "GPS permission is required for navigation."}
              </div>
            ) : null}

            {shareError ? (
              <div className="mt-2 rounded-lg border border-[#b4141e]/40 bg-[#10080a]/70 px-3 py-2 text-[10px] leading-5 text-[#f0c9ce]">
                {shareError}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 p-2">
          <button
            type="button"
            onClick={onRecenter}
            disabled={!canRecenter}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-white/10 px-2 py-2.5 text-[9px] uppercase tracking-[0.1em] text-zinc-200 transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7] disabled:cursor-not-allowed disabled:text-zinc-600"
          >
            <span aria-hidden>◎</span>
            Recenter
          </button>
          <button
            type="button"
            onClick={onRetryGps}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#b4141e]/70 bg-[#b4141e]/20 px-2 py-2.5 text-[9px] uppercase tracking-[0.1em] text-[#f4dadd] transition hover:bg-[#b4141e]/35"
          >
            <span aria-hidden>↻</span>
            {navigationState === "gps_permission_required" || navigationState === "error"
              ? "Retry GPS"
              : "Refresh GPS"}
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-white/10 px-2 py-2.5 text-[9px] uppercase tracking-[0.1em] text-zinc-200 transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7]"
          >
            <span aria-hidden>{isPaused ? "▶" : "❚❚"}</span>
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse details" : "Expand details"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path
                d="M3 5.5 7 9.5 11 5.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpandedMetrics({ metrics }: { metrics: NavigationMetrics }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      <DetailMetric label="Next instruction" value={metrics.nextInstructionLabel} />
      <DetailMetric label="ETA" value={metrics.etaLabel} />
      <DetailMetric label="Remaining" value={metrics.distanceRemainingLabel} />
      <DetailMetric label="Time left" value={metrics.timeRemainingLabel} />
      <DetailMetric label="Progress" value={metrics.routeProgressLabel} />
      <DetailMetric label="To maneuver" value={metrics.distanceToManeuverLabel} />
    </div>
  );
}

export const NavigationHud = memo(NavigationHudComponent);
