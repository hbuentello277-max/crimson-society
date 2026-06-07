"use client";

import type { RelationshipLink } from "@/lib/operational-intelligence/types";
import { strengthLabel } from "@/lib/operational-intelligence/scoring";
import { NexusPanel } from "@/components/nexus/NexusShared";

export function RelationshipMap({ relationships }: { relationships: RelationshipLink[] }) {
  if (relationships.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
        Not enough signal overlap to map relationships yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {relationships.map((relationship) => (
        <NexusPanel key={relationship.id}>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#b4141e]/30 bg-[#b4141e]/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7]">
                {strengthLabel(relationship.strength)}
              </span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                {relationship.category}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <p className="break-words text-sm font-medium text-white">{relationship.source_label}</p>
              <span className="hidden text-center text-zinc-600 sm:block">↔</span>
              <p className="break-words text-sm font-medium text-white">{relationship.target_label}</p>
            </div>
            <p className="break-words text-sm leading-6 text-zinc-400">{relationship.summary}</p>
          </div>
        </NexusPanel>
      ))}
    </div>
  );
}
