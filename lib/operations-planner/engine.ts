import type { SupabaseClient } from "@supabase/supabase-js";
import { buildOperationsPlanDraft } from "@/lib/operations-planner/plan-builder";
import {
  generateOperationsPlan,
  getOperationsPlanById,
  listOperationsPlans,
} from "@/lib/operations-planner/manager";
import type {
  GenerateOperationsPlanInput,
  OperationsPlanSummary,
  RecommendedOperationsPlan,
} from "@/lib/operations-planner/types";
import { runCached } from "@/lib/nexus/request-cache";

export async function getOperationsPlansSummary(
  supabase: SupabaseClient,
): Promise<OperationsPlanSummary> {
  const plans = await listOperationsPlans(supabase, 20);
  return {
    collected_at: new Date().toISOString(),
    plans,
    readOnly: true,
  };
}

export async function getRecommendedOperationsPlan(
  supabase: SupabaseClient,
): Promise<RecommendedOperationsPlan> {
  return runCached(supabase, "nexus:operations-planner:recommended", async () => {
    const draft = await buildOperationsPlanDraft(supabase, {
      ownerId: "preview",
      transcript: "recommended plan preview",
    });

    const hasTrigger =
      draft.related_risks.length > 0 ||
      draft.related_opportunities.length > 0 ||
      draft.priority === "high" ||
      draft.priority === "critical";

    if (!hasTrigger) {
      return { available: false, plan: null, trigger: null, readOnly: true };
    }

    const trigger =
      draft.plan_type === "launch"
        ? "launch_blocker"
        : draft.related_risks.length > 0
          ? "risk"
          : "opportunity";

    const now = new Date().toISOString();
    return {
      available: true,
      trigger,
      readOnly: true,
      plan: {
        ...draft,
        id: "recommended-preview",
        created_at: now,
        updated_at: now,
      },
    };
  });
}

export {
  generateOperationsPlan,
  getOperationsPlanById,
  listOperationsPlans,
  buildOperationsPlanDraft,
};

export type { GenerateOperationsPlanInput };
