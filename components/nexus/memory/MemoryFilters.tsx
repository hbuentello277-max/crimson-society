"use client";

import type { MemoryEntrySummaryRow } from "@/lib/memory/types";
import type { NexusMemoryEntryType } from "@/lib/nexus/constants";
import { NEXUS_MEMORY_ENTRY_TYPES } from "@/lib/nexus/constants";
import { NexusTabFilter } from "@/components/nexus/NexusShared";

export function MemoryFilters({
  entryType,
  counts,
  onEntryTypeChange,
}: {
  entryType: NexusMemoryEntryType | "all";
  counts: Partial<Record<NexusMemoryEntryType | "all", number>>;
  onEntryTypeChange: (value: NexusMemoryEntryType | "all") => void;
}) {
  const tabs = [
    { id: "all" as const, label: "All", count: counts.all },
    ...NEXUS_MEMORY_ENTRY_TYPES.map((type) => ({
      id: type,
      label: type.replaceAll("_", " "),
      count: counts[type],
    })),
  ];

  return (
    <NexusTabFilter
      tabs={tabs}
      value={entryType}
      onChange={onEntryTypeChange}
    />
  );
}

export function filterMemoryEntries(
  entries: MemoryEntrySummaryRow[],
  entryType: NexusMemoryEntryType | "all",
) {
  if (entryType === "all") return entries;
  return entries.filter((entry) => entry.entry_type === entryType);
}
