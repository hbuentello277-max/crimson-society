import type { SupabaseClient } from "@supabase/supabase-js";
import { createNexusActionCard } from "@/lib/action-center/manager";
import type { NexusActionType } from "@/lib/action-center/types";
import { getCrossSystemIntelligenceSummary } from "@/lib/cross-system-intelligence/engine";

export async function prepareIntelligenceActionDraft(
  supabase: SupabaseClient,
  input: {
    ownerId: string;
    actionType?: NexusActionType;
    insightId?: string;
  },
) {
  const summary = await getCrossSystemIntelligenceSummary(supabase, { access: "owner" });

  let actionType = input.actionType;
  if (!actionType && input.insightId) {
    const insight = summary.insights.find((item) => item.id === input.insightId);
    actionType = insight?.suggested_action_type;
  }

  if (!actionType) {
    const recommendation = summary.recommendations[0];
    actionType = recommendation?.suggested_action_type;
  }

  if (!actionType) {
    return { ok: false as const, error: "No recommended action is available from Platform Intelligence." };
  }

  const matchingInsight =
    summary.insights.find((item) => item.suggested_action_type === actionType) ??
    summary.insights[0];

  const transcript = [
    `Prepare ${actionType.replaceAll("_", " ")} from Platform Intelligence.`,
    matchingInsight?.explanation,
  ]
    .filter(Boolean)
    .join(" ");

  return createNexusActionCard(supabase, {
    ownerId: input.ownerId,
    actionType,
    transcript,
  });
}
