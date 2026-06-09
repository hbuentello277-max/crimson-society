import type { SupabaseClient } from "@supabase/supabase-js";
import { generateOperationsPlan } from "@/lib/operations-planner/engine";
import { createActionDraftsFromOperationsPlan } from "@/lib/operations-planner/action-integration";
import { resolvePlanTypeFromTranscript } from "@/lib/operations-planner/plan-builder";
import type { NexusVoiceActionResult } from "@/lib/admin/nexus-voice/types";

export async function runNexusOperationsPlannerVoiceTool(
  tool: "generateOperationsPlan" | "createOperationsPlanActionDrafts",
  admin: SupabaseClient,
  options: { transcript?: string; ownerId: string; planId?: string },
): Promise<NexusVoiceActionResult> {
  if (tool === "generateOperationsPlan") {
    const transcript = options.transcript?.trim() ?? "";
    const planType = resolvePlanTypeFromTranscript(transcript) ?? undefined;
    const result = await generateOperationsPlan(admin, {
      ownerId: options.ownerId,
      planType,
      transcript,
    });

    if (!result.ok) {
      return { tool, data: { error: result.error } };
    }

    return {
      tool,
      data: {
        plan: {
          id: result.plan.id,
          title: result.plan.title,
          plan_type: result.plan.plan_type,
          priority: result.plan.priority,
          confidence_score: result.plan.confidence_score,
          estimated_impact_score: result.plan.estimated_impact_score,
          steps: result.plan.steps.map((step) => step.title),
        },
      },
    };
  }

  if (!options.planId) {
    const generated = await generateOperationsPlan(admin, {
      ownerId: options.ownerId,
      transcript: options.transcript,
    });
    if (!generated.ok) {
      return { tool, data: { error: generated.error } };
    }
    options.planId = generated.plan.id;
  }

  const drafts = await createActionDraftsFromOperationsPlan(admin, {
    ownerId: options.ownerId,
    planId: options.planId,
  });

  if (!drafts.ok) {
    return { tool, data: { error: drafts.error } };
  }

  return {
    tool,
    data: {
      created: drafts.created,
    },
  };
}
