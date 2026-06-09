import type { SupabaseClient } from "@supabase/supabase-js";
import { createNexusActionCard } from "@/lib/action-center/manager";
import { getOperationsPlanById } from "@/lib/operations-planner/manager";
import type { NexusActionType } from "@/lib/action-center/types";

export async function createActionDraftsFromOperationsPlan(
  supabase: SupabaseClient,
  input: {
    ownerId: string;
    planId: string;
    actionTypes?: NexusActionType[];
  },
): Promise<
  | { ok: true; created: Array<{ action_type: NexusActionType; action_id: string }> }
  | { ok: false; error: string }
> {
  const plan = await getOperationsPlanById(supabase, input.planId);
  if (!plan) {
    return { ok: false, error: "Operations plan not found." };
  }

  const drafts = input.actionTypes?.length
    ? plan.suggested_action_drafts.filter((draft) => input.actionTypes?.includes(draft.action_type))
    : plan.suggested_action_drafts;

  if (drafts.length === 0) {
    const stepDrafts = plan.steps
      .filter((step) => step.suggested_action_type)
      .map((step) => ({
        action_type: step.suggested_action_type!,
        title: step.title,
        reason: step.summary,
      }));
    drafts.push(...stepDrafts);
  }

  const unique = new Map<string, (typeof drafts)[number]>();
  for (const draft of drafts) {
    if (!unique.has(draft.action_type)) {
      unique.set(draft.action_type, draft);
    }
  }

  const created: Array<{ action_type: NexusActionType; action_id: string }> = [];

  for (const draft of unique.values()) {
    const transcript = [
      `Create action plan draft from Operations Planner: ${plan.title}.`,
      draft.reason,
      `Step context: ${draft.title}`,
    ].join(" ");

    const result = await createNexusActionCard(supabase, {
      ownerId: input.ownerId,
      actionType: draft.action_type,
      transcript,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    created.push({ action_type: draft.action_type, action_id: result.action.id });
  }

  return { ok: true, created };
}
