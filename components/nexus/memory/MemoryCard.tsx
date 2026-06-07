"use client";

import type { MemoryEntrySummaryRow } from "@/lib/memory/types";
import type { NexusMemoryEntryType } from "@/lib/nexus/constants";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";

const TYPE_LABELS: Record<NexusMemoryEntryType, string> = {
  deployment: "Deployment",
  milestone: "Milestone",
  growth: "Growth",
  revenue: "Revenue",
  incident: "Incident",
  alert: "Alert",
  briefing: "Briefing",
  report: "Report",
  intelligence: "Intelligence",
  command: "Command",
  owner_note: "Owner Note",
};

export function MemoryCard({ entry }: { entry: MemoryEntrySummaryRow }) {
  return (
    <article className="rounded-2xl border border-[#b4141e]/20 bg-[#0a0608]/80 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#e87a82]">
            {TYPE_LABELS[entry.entry_type]}
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">{entry.title}</h3>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Importance {entry.importance_score}
          </p>
          <p className="mt-1 text-[10px] text-zinc-400">
            {formatRelativeTime(entry.occurred_at) || formatDateTime(entry.occurred_at)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{entry.summary}</p>
      <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        Source: {entry.source}
      </p>
    </article>
  );
}
