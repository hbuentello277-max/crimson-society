import type { SupabaseClient } from "@supabase/supabase-js";
import { buildOperationsPlanDraft } from "@/lib/operations-planner/plan-builder";
import type {
  GenerateOperationsPlanInput,
  OperationsPlan,
  OperationsPlanType,
} from "@/lib/operations-planner/types";

export function mapOperationsPlanRow(row: Record<string, unknown>): OperationsPlan {
  return {
    id: row.id as string,
    plan_type: row.plan_type as OperationsPlanType,
    title: row.title as string,
    objective: row.objective as string,
    priority: row.priority as OperationsPlan["priority"],
    confidence_score: Number(row.confidence_score ?? 0),
    estimated_impact_score: Number(row.estimated_impact_score ?? 0),
    reason: row.reason as string,
    steps: (row.steps as OperationsPlan["steps"]) ?? [],
    related_risks: (row.related_risks as OperationsPlan["related_risks"]) ?? [],
    related_opportunities: (row.related_opportunities as OperationsPlan["related_opportunities"]) ?? [],
    suggested_action_drafts:
      (row.suggested_action_drafts as OperationsPlan["suggested_action_drafts"]) ?? [],
    status: row.status as OperationsPlan["status"],
    created_by_label: (row.created_by_label as string) ?? "NEXUS",
    created_by_user_id: (row.created_by_user_id as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listOperationsPlans(
  supabase: SupabaseClient,
  limit = 20,
): Promise<OperationsPlan[]> {
  const { data, error } = await supabase
    .from("nexus_operations_plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapOperationsPlanRow);
}

export async function getOperationsPlanById(
  supabase: SupabaseClient,
  planId: string,
): Promise<OperationsPlan | null> {
  const { data, error } = await supabase
    .from("nexus_operations_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapOperationsPlanRow(data as Record<string, unknown>) : null;
}

export async function generateOperationsPlan(
  supabase: SupabaseClient,
  input: GenerateOperationsPlanInput,
): Promise<{ ok: true; plan: OperationsPlan } | { ok: false; error: string }> {
  const draft = await buildOperationsPlanDraft(supabase, input);

  const { data, error } = await supabase
    .from("nexus_operations_plans")
    .insert({
      ...draft,
      steps: draft.steps,
      related_risks: draft.related_risks,
      related_opportunities: draft.related_opportunities,
      suggested_action_drafts: draft.suggested_action_drafts,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to save operations plan." };
  }

  return { ok: true, plan: mapOperationsPlanRow(data as Record<string, unknown>) };
}
