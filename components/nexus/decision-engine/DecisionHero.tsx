"use client";

import type { DecisionPriority } from "@/lib/decision-engine/types";
import { decisionPriorityLabel } from "@/lib/decision-engine/scoring";
import { NexusRefreshButton } from "@/components/nexus/NexusShared";

const PRIORITY_STYLES: Record<DecisionPriority, { border: string; text: string; badge: string }> = {
  critical: {
    border: "border-red-500/40",
    text: "text-red-200",
    badge: "border-red-500/40 bg-red-500/10 text-red-200",
  },
  high: {
    border: "border-amber-500/40",
    text: "text-amber-200",
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  },
  medium: {
    border: "border-[#b4141e]/35",
    text: "text-[#f1c3c7]",
    badge: "border-[#b4141e]/35 bg-[#b4141e]/10 text-[#f1c3c7]",
  },
  low: {
    border: "border-zinc-500/30",
    text: "text-zinc-300",
    badge: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  },
};

export function DecisionHero({
  bestDecision,
  priority,
  decisionScore,
  onRefresh,
  loading = false,
}: {
  bestDecision: string;
  priority: DecisionPriority;
  decisionScore: number;
  onRefresh: () => void;
  loading?: boolean;
}) {
  const styles = PRIORITY_STYLES[priority];

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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.16),transparent_62%)]"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">Executive Decision Engine</p>
          <p className="mt-1 text-sm leading-snug text-white">Strategic decision support</p>
        </div>
        <NexusRefreshButton
          compact
          onClick={onRefresh}
          loading={loading}
          disabled={loading}
          loadingLabel="Syncing..."
        />
      </div>

      <div className="relative mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Best Decision Now</p>
          <p className={`mt-2 break-words text-base leading-7 sm:text-lg ${styles.text}`}>{bestDecision}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${styles.badge}`}
          >
            {decisionPriorityLabel(priority)}
          </span>
          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-400">
            Score {decisionScore}
          </span>
        </div>
      </div>
    </section>
  );
}
