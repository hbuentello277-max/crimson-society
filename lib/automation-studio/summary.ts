import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateAutomationCondition } from "@/lib/automation-studio/conditions";
import {
  listAutomationHistory,
  listAutomationRules,
  listAutomationTriggers,
} from "@/lib/automation-studio/manager";
import { AUTOMATION_RULE_TEMPLATES } from "@/lib/automation-studio/templates";
import type {
  AutomationStudioSummary,
  AutomationTemplateSuggestion,
} from "@/lib/automation-studio/types";

async function buildSuggestedRules(
  supabase: SupabaseClient,
): Promise<AutomationTemplateSuggestion[]> {
  const existing = await listAutomationRules(supabase, 100);
  const existingTemplateIds = new Set(
    existing
      .map((rule) => rule.condition_config.template_id)
      .filter((value): value is string => typeof value === "string"),
  );

  const suggestions: AutomationTemplateSuggestion[] = [];

  for (const template of AUTOMATION_RULE_TEMPLATES) {
    const condition = await evaluateAutomationCondition(supabase, {
      condition_type: template.condition_type,
      condition_config: template.condition_config,
    });

    suggestions.push({
      template_id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      condition_type: template.condition_type,
      currently_relevant: condition.met,
      relevance_reason: condition.reason,
    });

    void existingTemplateIds;
  }

  return suggestions.sort(
    (a, b) => Number(b.currently_relevant) - Number(a.currently_relevant),
  );
}

export async function getAutomationStudioSummary(
  supabase: SupabaseClient,
  options: { readOnly?: boolean } = {},
): Promise<AutomationStudioSummary> {
  const [rules, triggers, history, suggested_rules] = await Promise.all([
    listAutomationRules(supabase),
    listAutomationTriggers(supabase),
    listAutomationHistory(supabase),
    buildSuggestedRules(supabase),
  ]);

  return {
    collected_at: new Date().toISOString(),
    readOnly: options.readOnly ?? false,
    active_rules: rules.filter((rule) => rule.status !== "disabled"),
    suggested_rules,
    recent_triggers: triggers,
    history,
    counts: {
      active: rules.filter((rule) => rule.status === "active").length,
      paused: rules.filter((rule) => rule.status === "paused").length,
      draft: rules.filter((rule) => rule.status === "draft").length,
      needs_approval: triggers.filter((trigger) => trigger.status === "needs_approval").length,
    },
  };
}
