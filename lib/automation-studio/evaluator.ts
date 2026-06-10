import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateAutomationCondition } from "@/lib/automation-studio/conditions";
import {
  appendAutomationHistory,
  getAutomationRuleById,
  listAutomationRules,
  mapAutomationTriggerRow,
} from "@/lib/automation-studio/manager";
import { prepareAutomationOutputs } from "@/lib/automation-studio/outputs";
import type { AutomationEvaluationResult } from "@/lib/automation-studio/types";

const TRIGGER_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function withinCooldown(lastTriggeredAt: string | null): boolean {
  if (!lastTriggeredAt) return false;
  return Date.now() - new Date(lastTriggeredAt).getTime() < TRIGGER_COOLDOWN_MS;
}

export async function evaluateAutomationRule(
  supabase: SupabaseClient,
  ownerId: string,
  ruleId: string,
): Promise<AutomationEvaluationResult> {
  const rule = await getAutomationRuleById(supabase, ruleId);
  if (!rule) {
    throw new Error("Automation rule not found.");
  }

  const checkedAt = new Date().toISOString();
  await supabase
    .from("nexus_automation_rules")
    .update({ last_checked_at: checkedAt, updated_at: checkedAt })
    .eq("id", ruleId);

  if (rule.status !== "active") {
    return {
      rule_id: ruleId,
      checked_at: checkedAt,
      condition_met: false,
      triggered: false,
      reason: `Rule is ${rule.status}; only active rules can trigger.`,
      outputs_prepared: [],
    };
  }

  const condition = await evaluateAutomationCondition(supabase, {
    condition_type: rule.condition_type,
    condition_config: rule.condition_config,
  });

  await appendAutomationHistory(supabase, {
    rule_id: ruleId,
    event_type: "rule_evaluated",
    summary: condition.met
      ? `Condition met for ${rule.name}`
      : `Condition not met for ${rule.name}`,
    actor_id: ownerId,
    details: condition.snapshot,
  });

  if (!condition.met) {
    return {
      rule_id: ruleId,
      checked_at: checkedAt,
      condition_met: false,
      triggered: false,
      reason: condition.reason,
      outputs_prepared: [],
    };
  }

  if (withinCooldown(rule.last_triggered_at)) {
    return {
      rule_id: ruleId,
      checked_at: checkedAt,
      condition_met: true,
      triggered: false,
      reason: "Condition met, but rule is in cooldown to avoid duplicate drafts.",
      outputs_prepared: [],
    };
  }

  const prepared = await prepareAutomationOutputs(supabase, {
    ownerId,
    ruleName: rule.name,
    outputs: rule.output_config.outputs ?? [],
    triggerReason: condition.reason,
  });

  const { data: triggerRow, error: triggerError } = await supabase
    .from("nexus_automation_triggers")
    .insert({
      rule_id: ruleId,
      trigger_reason: condition.reason,
      trigger_snapshot: condition.snapshot,
      generated_action_id: prepared.action_ids[0] ?? null,
      generated_plan_id: prepared.plan_ids[0] ?? null,
      status: "needs_approval",
    })
    .select("*")
    .single();

  if (triggerError || !triggerRow) {
    throw new Error(triggerError?.message ?? "Failed to record automation trigger.");
  }

  const trigger = mapAutomationTriggerRow(triggerRow as Record<string, unknown>);
  const triggeredAt = new Date().toISOString();

  await supabase
    .from("nexus_automation_rules")
    .update({
      last_triggered_at: triggeredAt,
      last_checked_at: checkedAt,
      updated_at: triggeredAt,
    })
    .eq("id", ruleId);

  await appendAutomationHistory(supabase, {
    rule_id: ruleId,
    trigger_id: trigger.id,
    event_type: "rule_triggered",
    summary: `Automation triggered: ${rule.name}`,
    actor_id: ownerId,
    details: {
      prepared: prepared.prepared_labels,
      action_ids: prepared.action_ids,
      plan_ids: prepared.plan_ids,
    },
  });

  return {
    rule_id: ruleId,
    checked_at: checkedAt,
    condition_met: true,
    triggered: true,
    trigger_id: trigger.id,
    reason: condition.reason,
    outputs_prepared: prepared.prepared_labels,
  };
}

export async function evaluateActiveAutomationRules(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<AutomationEvaluationResult[]> {
  const rules = await listAutomationRules(supabase, 100);
  const active = rules.filter((rule) => rule.status === "active");
  const results: AutomationEvaluationResult[] = [];

  for (const rule of active) {
    results.push(await evaluateAutomationRule(supabase, ownerId, rule.id));
  }

  return results;
}
