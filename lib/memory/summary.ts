import type { SupabaseClient } from "@supabase/supabase-js";
import { mapMemoryRow } from "@/lib/memory/manager";
import type { NexusMemorySummary } from "@/lib/memory/types";
import { NEXUS_MEMORY_ENTRY_TYPES, type NexusMemoryEntryType } from "@/lib/nexus/constants";
import { cacheKey, runCached } from "@/lib/nexus/request-cache";

const DEFAULT_LIMIT = 100;

export function getNexusMemorySummary(
  supabase: SupabaseClient,
  options?: {
    entryType?: NexusMemoryEntryType | "all";
    limit?: number;
  },
): Promise<NexusMemorySummary> {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), 200);
  const entryType = options?.entryType ?? "all";

  return runCached(
    supabase,
    cacheKey("nexus:memory-summary", { limit, entryType }),
    () => getNexusMemorySummaryImpl(supabase, { limit, entryType }),
  );
}

async function getNexusMemorySummaryImpl(
  supabase: SupabaseClient,
  options: { limit: number; entryType: NexusMemoryEntryType | "all" },
): Promise<NexusMemorySummary> {
  const { limit, entryType } = options;

  let query = supabase
    .from("nexus_memory_entries")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (entryType !== "all") {
    query = query.eq("entry_type", entryType);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const entries = (data ?? []).map((row) => mapMemoryRow(row as Record<string, unknown>));

  const counts = {
    all: entries.length,
    ...Object.fromEntries(NEXUS_MEMORY_ENTRY_TYPES.map((type) => [type, 0])),
  } as NexusMemorySummary["counts"];

  for (const entry of entries) {
    counts[entry.entry_type] += 1;
  }

  return {
    collected_at: new Date().toISOString(),
    counts,
    entries,
  };
}

export function groupMemoryBySection(entries: NexusMemorySummary["entries"]) {
  const milestoneTypes = new Set<NexusMemoryEntryType>(["milestone", "growth", "revenue"]);
  const operationsTypes = new Set<NexusMemoryEntryType>([
    "deployment",
    "incident",
    "alert",
    "command",
    "briefing",
    "report",
    "intelligence",
  ]);

  return {
    timeline: entries,
    milestones: entries.filter((entry) => milestoneTypes.has(entry.entry_type)),
    operations: entries.filter((entry) => operationsTypes.has(entry.entry_type)),
    growthRevenue: entries.filter(
      (entry) => entry.entry_type === "growth" || entry.entry_type === "revenue",
    ),
    ownerNotes: entries.filter((entry) => entry.entry_type === "owner_note"),
  };
}
