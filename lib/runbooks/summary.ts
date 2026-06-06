import type { SupabaseClient } from "@supabase/supabase-js";
import type { NexusRunbookCategory } from "@/lib/nexus/constants";
import { NEXUS_RUNBOOK_CATEGORIES } from "@/lib/nexus/constants";
import { mapRunbookRow } from "@/lib/runbooks/manager";
import type { NexusRunbookSummaryRow, NexusRunbooksSummary } from "@/lib/runbooks/types";

function mapSummaryRow(row: Record<string, unknown>): NexusRunbookSummaryRow {
  const runbook = mapRunbookRow(row);
  return {
    id: runbook.id,
    slug: runbook.slug,
    title: runbook.title,
    category: runbook.category,
    severity: runbook.severity,
    description: runbook.description,
    trigger_count: runbook.trigger_types.length,
    status: runbook.status,
    updated_at: runbook.updated_at,
    created_at: runbook.created_at,
  };
}

export async function getNexusRunbooksSummary(
  supabase: SupabaseClient,
  options?: { category?: NexusRunbookCategory | "all"; includeArchived?: boolean },
): Promise<NexusRunbooksSummary> {
  let query = supabase
    .from("nexus_runbooks")
    .select(
      "id, slug, title, category, severity, description, trigger_types, checklist, resolution_steps, verification_steps, owner_notes, status, metadata, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (!options?.includeArchived) {
    query = query.eq("status", "active");
  }

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  const { data, error } = await query.limit(200);
  if (error) {
    throw new Error(error.message);
  }

  const runbooks = (data ?? []).map((row) => mapSummaryRow(row as Record<string, unknown>));
  const counts = {
    all: runbooks.length,
    infrastructure: 0,
    user_workflows: 0,
    revenue: 0,
    growth: 0,
    security: 0,
    operations: 0,
  } satisfies NexusRunbooksSummary["counts"];

  for (const category of NEXUS_RUNBOOK_CATEGORIES) {
    counts[category] = runbooks.filter((row) => row.category === category).length;
  }

  return {
    collected_at: new Date().toISOString(),
    counts,
    runbooks,
  };
}

export async function getActiveRunbooks(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("nexus_runbooks")
    .select(
      "id, slug, title, category, severity, description, trigger_types, checklist, resolution_steps, verification_steps, owner_notes, status, metadata, created_at, updated_at",
    )
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRunbookRow(row as Record<string, unknown>));
}
