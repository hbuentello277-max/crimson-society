"use client";

import type { ReactNode } from "react";
import type { MissionStatus } from "@/lib/mission-control/types";
import { missionStatusLabel } from "@/lib/mission-control/score";
import { NexusRefreshButton } from "@/components/nexus/NexusShared";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

const STATUS_STYLES: Record<
  MissionStatus,
  { border: string; glow: string; text: string; badge: string }
> = {
  dominating: {
    border: "border-emerald-500/40",
    glow: "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_62%)]",
    text: "text-emerald-300",
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  },
  growing: {
    border: "border-[#b4141e]/40",
    glow: "bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.2),transparent_62%)]",
    text: "text-[#f1c3c7]",
    badge: "border-[#b4141e]/50 bg-[#b4141e]/15 text-[#f1c3c7]",
  },
  stable: {
    border: "border-zinc-500/30",
    glow: "bg-[radial-gradient(circle_at_center,rgba(113,113,122,0.12),transparent_62%)]",
    text: "text-zinc-200",
    badge: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
  },
  at_risk: {
    border: "border-amber-500/40",
    glow: "bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.16),transparent_62%)]",
    text: "text-amber-200",
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  },
  critical: {
    border: "border-red-500/50",
    glow: "bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.2),transparent_62%)]",
    text: "text-red-200",
    badge: "border-red-500/50 bg-red-500/10 text-red-200",
  },
};

export function MissionStatusHero({
  missionStatus,
  missionScore,
  primaryFocus,
  missionSummary,
  onRefresh,
  loading = false,
}: {
  missionStatus: MissionStatus;
  missionScore: number;
  primaryFocus: string;
  missionSummary: string;
  onRefresh: () => void;
  loading?: boolean;
}) {
  const styles = STATUS_STYLES[missionStatus];

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${styles.border} bg-[#030303]/90 p-4 shadow-[0_0_40px_rgba(180,20,30,0.1)] sm:p-6`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(180,20,30,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(180,20,30,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div aria-hidden className={`pointer-events-none absolute inset-0 ${styles.glow}`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">Founder Platform Status</p>
          <p className="mt-1 text-sm leading-snug text-white">Crimson Society Strategic View</p>
        </div>
        <NexusRefreshButton
          compact
          onClick={onRefresh}
          loading={loading}
          disabled={loading}
          loadingLabel="Syncing..."
        />
      </div>

      <div className="relative mt-6 grid gap-4 sm:grid-cols-3">
        <HeroMetric label="Platform Status">
          <span className={`text-2xl font-medium uppercase tracking-[0.08em] sm:text-3xl ${styles.text}`}>
            {missionStatusLabel(missionStatus)}
          </span>
        </HeroMetric>
        <HeroMetric label="Platform Score">
          <span className="text-4xl font-semibold tabular-nums text-white sm:text-5xl">{missionScore}</span>
          <span className="text-sm text-zinc-500">/ 100</span>
        </HeroMetric>
        <HeroMetric label="Primary Focus">
          <p className="break-words text-sm leading-6 text-zinc-200 sm:text-base">
            {formatNexusDisplayText(primaryFocus)}
          </p>
        </HeroMetric>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${styles.badge}`}
        >
          {missionStatusLabel(missionStatus)}
        </span>
        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-400">
          Platform Score {missionScore}
        </span>
      </div>

      <p className="relative mt-4 break-words text-sm leading-7 text-zinc-400">
        {formatNexusDisplayText(missionSummary)}
      </p>
    </section>
  );
}

function HeroMetric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-4">
      <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <div className="mt-3 flex min-w-0 flex-wrap items-baseline gap-2">{children}</div>
    </div>
  );
}
