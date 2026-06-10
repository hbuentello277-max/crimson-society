import type { SupabaseClient } from "@supabase/supabase-js";
import { createNexusActionCard } from "@/lib/action-center/manager";
import { createOwnerNote } from "@/lib/memory/manager";
import { generateOperationsPlan } from "@/lib/operations-planner/manager";
import {
  assertSafeAutomationOutputs,
  automationOutputsAreDraftOnly,
} from "@/lib/automation-studio/safety";
import type { AutomationOutputSpec } from "@/lib/automation-studio/types";

export type PreparedAutomationOutputs = {
  action_ids: string[];
  plan_ids: string[];
  memory_entry_ids: string[];
  prepared_labels: string[];
};

export async function prepareAutomationOutputs(
  supabase: SupabaseClient,
  input: {
    ownerId: string;
    ruleName: string;
    outputs: AutomationOutputSpec[];
    triggerReason: string;
  },
): Promise<PreparedAutomationOutputs> {
  assertSafeAutomationOutputs(input.outputs);
  if (!automationOutputsAreDraftOnly(input.outputs)) {
    throw new Error("Automation outputs must remain draft-only.");
  }

  const result: PreparedAutomationOutputs = {
    action_ids: [],
    plan_ids: [],
    memory_entry_ids: [],
    prepared_labels: [],
  };

  for (const output of input.outputs) {
    switch (output.kind) {
      case "action_draft": {
        const created = await createNexusActionCard(supabase, {
          ownerId: input.ownerId,
          actionType: output.action_type,
          transcript:
            output.transcript ??
            `Automation Studio prepared ${output.action_type} for ${input.ruleName}. ${input.triggerReason}`,
        });
        if (!created.ok) {
          throw new Error(created.error);
        }
        result.action_ids.push(created.action.id);
        result.prepared_labels.push(`Action draft: ${created.action.title}`);
        break;
      }
      case "operations_plan": {
        const created = await generateOperationsPlan(supabase, {
          ownerId: input.ownerId,
          planType: output.plan_type,
          transcript: output.transcript,
        });
        if (!created.ok) {
          throw new Error(created.error);
        }
        result.plan_ids.push(created.plan.id);
        result.prepared_labels.push(`Operations plan: ${created.plan.title}`);
        break;
      }
      case "owner_note": {
        const created = await createOwnerNote(supabase, input.ownerId, {
          title: output.title,
          summary: `${output.summary} Trigger: ${input.triggerReason}`,
          importance_score: 7,
        });
        if (!created.ok) {
          throw new Error(created.error);
        }
        result.memory_entry_ids.push(created.entry.id);
        result.prepared_labels.push(`Founder note: ${created.entry.title}`);
        break;
      }
      case "weekly_report": {
        const created = await createNexusActionCard(supabase, {
          ownerId: input.ownerId,
          actionType: "weekly_report",
          transcript: `Automation Studio prepared weekly report draft for ${input.ruleName}.`,
        });
        if (!created.ok) {
          throw new Error(created.error);
        }
        result.action_ids.push(created.action.id);
        result.prepared_labels.push(`Report draft: ${created.action.title}`);
        break;
      }
      default:
        break;
    }
  }

  return result;
}
