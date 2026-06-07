"use client";

import { useMemo, useState } from "react";
import type { MemoryEntrySummaryRow } from "@/lib/memory/types";
import type { NexusMemoryEntryType } from "@/lib/nexus/constants";
import { groupMemoryBySection } from "@/lib/memory/summary";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { MemoryCard } from "@/components/nexus/memory/MemoryCard";
import { filterMemoryEntries, MemoryFilters } from "@/components/nexus/memory/MemoryFilters";
import { MemoryTimeline } from "@/components/nexus/memory/MemoryTimeline";
import { OwnerNoteForm } from "@/components/nexus/memory/OwnerNoteForm";
import { NexusListEmpty, NexusSectionFrame } from "@/components/nexus/NexusShared";

type MemoryPayload = {
  ok?: boolean;
  collected_at?: string;
  counts?: Partial<Record<NexusMemoryEntryType | "all", number>>;
  entries?: MemoryEntrySummaryRow[];
};

function MemorySection({
  title,
  description,
  entries,
}: {
  title: string;
  description: string;
  entries: MemoryEntrySummaryRow[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
          No entries in this section yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {entries.map((entry) => (
            <MemoryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

export function NexusMemoryCenter() {
  const [entryType, setEntryType] = useState<NexusMemoryEntryType | "all">("all");
  const { data, error, loading, refresh } = useNexusFetch<MemoryPayload>("/api/nexus/memory?limit=120");

  const entries = data?.entries ?? [];
  const filtered = useMemo(
    () => filterMemoryEntries(entries, entryType),
    [entries, entryType],
  );
  const sections = useMemo(() => groupMemoryBySection(filtered), [filtered]);

  return (
    <NexusSectionFrame
      title="Memory"
      description="Historical operational memory for Crimson Society. Deterministic records plus owner notes. Mark I — read-only generation, no AI."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm text-zinc-300">
            Nexus Memory preserves deployments, milestones, incidents, alerts, reports, briefings,
            intelligence findings, commands, and owner notes. Entries dedupe via metadata keys.
          </div>

          <MemoryFilters
            entryType={entryType}
            counts={data?.counts ?? {}}
            onEntryTypeChange={setEntryType}
          />

          <section className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Timeline</p>
              <p className="mt-1 text-xs text-zinc-500">Chronological operational history</p>
            </div>
            {filtered.length === 0 ? (
              <NexusListEmpty
                title="No memory entries"
                description="Run Sync on the Founder Dashboard or add an owner note to begin building memory."
              />
            ) : (
              <MemoryTimeline entries={filtered.slice(0, 24)} />
            )}
          </section>

          <MemorySection
            title="Milestones"
            description="Platform milestones and threshold events"
            entries={sections.milestones}
          />

          <MemorySection
            title="Operations History"
            description="Deployments, incidents, alerts, commands, reports, briefings, intelligence"
            entries={sections.operations}
          />

          <MemorySection
            title="Growth & Revenue"
            description="Community and revenue memory signals"
            entries={sections.growthRevenue}
          />

          <section className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Owner Notes</p>
              <p className="mt-1 text-xs text-zinc-500">Manual founder annotations</p>
            </div>
            <OwnerNoteForm onCreated={refresh} />
            <div className="grid gap-3 md:grid-cols-2">
              {sections.ownerNotes.map((entry) => (
                <MemoryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}
