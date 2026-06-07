import type { SupabaseClient } from "@supabase/supabase-js";
import { generateProposedAutomationActions } from "@/lib/automation/generator";
import { mapAutomationRow } from "@/lib/automation/manager";
import type { NexusAutomationSummary } from "@/lib/automation/types";
import {
  NEXUS_AUTOMATION_ACTION_TYPES,
  NEXUS_AUTOMATION_STATUSES,
  type NexusAutomationActionType,
  type NexusAutomationStatus,
} from "@/lib/nexus/constants";

const DEFAULT_LIMIT = 100;

export async function getNexusAutomationSummary(
  supabase: SupabaseClient,
  options?: {
    status?: NexusAutomationStatus | "all";
    actionType?: NexusAutomationActionType | "all";
    limit?: number;
    generate?: boolean;
  },
): Promise<NexusAutomationSummary> {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), 200);
  const status = options?.status ?? "all";
  const actionType = options?.actionType ?? "all";
  const shouldGenerate = options?.generate ?? true;

  const generation = shouldGenerate
    ? await generateProposedAutomationActions(supabase)
    : {
        ok: true,
        evaluated_at: new Date().toISOString(),
        drafts_considered: 0,
        actions_created: 0,
        actions_skipped: 0,
      };

  let query = supabase
    .from("nexus_automation_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (actionType !== "all") {
    query = query.eq("action_type", actionType);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const actions = (data ?? []).map((row) => mapAutomationRow(row as Record<string, unknown>));

  const counts = {
    all: actions.length,
    ...Object.fromEntries(NEXUS_AUTOMATION_STATUSES.map((value) => [value, 0])),
  } as NexusAutomationSummary["counts"];

  const counts_by_type = Object.fromEntries(
    NEXUS_AUTOMATION_ACTION_TYPES.map((value) => [value, 0]),
  ) as NexusAutomationSummary["counts_by_type"];

  for (const action of actions) {
    counts[action.status] += 1;
    counts_by_type[action.action_type] += 1;
  }

  return {
    collected_at: new Date().toISOString(),
    generation,
    counts,
    counts_by_type,
    actions,
  };
}
