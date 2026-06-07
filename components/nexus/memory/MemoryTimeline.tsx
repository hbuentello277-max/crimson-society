"use client";

import type { MemoryEntrySummaryRow } from "@/lib/memory/types";
import { formatDateTime } from "@/lib/nexus/format";
import { MemoryCard } from "@/components/nexus/memory/MemoryCard";

export function MemoryTimeline({ entries }: { entries: MemoryEntrySummaryRow[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-zinc-500">
        No memory entries recorded yet.
      </div>
    );
  }

  return (
    <div className="relative space-y-4 pl-4 before:absolute before:bottom-0 before:left-[7px] before:top-0 before:w-px before:bg-[#b4141e]/25">
      {entries.map((entry) => (
        <div key={entry.id} className="relative">
          <span
            aria-hidden
            className="absolute -left-4 top-5 h-2.5 w-2.5 rounded-full border border-[#b4141e]/60 bg-[#b4141e]/30"
          />
          <div className="mb-2 pl-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              {formatDateTime(entry.occurred_at)}
            </p>
          </div>
          <MemoryCard entry={entry} />
        </div>
      ))}
    </div>
  );
}
