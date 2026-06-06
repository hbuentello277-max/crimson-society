import type { SupabaseClient } from "@supabase/supabase-js";

export type NexusEventFeedRow = {
  id: string;
  source: string;
  category: string;
  event_type: string;
  severity: string;
  title: string;
  description: string | null;
  occurred_at: string;
};

export type NexusEventsFeedSummary = {
  collected_at: string;
  events: NexusEventFeedRow[];
};

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

export async function getNexusRecentEvents(
  supabase: SupabaseClient,
  limit = DEFAULT_LIMIT,
): Promise<NexusEventsFeedSummary> {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

  const { data, error } = await supabase
    .from("nexus_events")
    .select("id, source, category, event_type, severity, title, description, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message);
  }

  return {
    collected_at: new Date().toISOString(),
    events: (data ?? []).map((row) => ({
      id: row.id as string,
      source: row.source as string,
      category: row.category as string,
      event_type: row.event_type as string,
      severity: row.severity as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      occurred_at: row.occurred_at as string,
    })),
  };
}
