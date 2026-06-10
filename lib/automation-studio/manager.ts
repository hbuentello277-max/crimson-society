import type { SupabaseClient } from "@supabase/supabase-js";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { buildRuleInputFromTemplate } from "@/lib/automation-studio/templates";
import type {
  AutomationHistoryEntry,
  AutomationRule,
  AutomationTrigger,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from "@/lib/automation-studio/types";

export function mapAutomationRuleRow(row: Record<string, unknown>): AutomationRule {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    category: row.category as AutomationRule["category"],
    condition_type: row.condition_type as AutomationRule["condition_type"],
    condition_config: (row.condition_config as Record<string, unknown>) ?? {},
    output_type: (row.output_type as string) ?? "bundle",
    output_config: (row.output_config as AutomationRule["output_config"]) ?? { outputs: [] },
    status: row.status as AutomationRule["status"],
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    last_checked_at: (row.last_checked_at as string | null) ?? null,
    last_triggered_at: (row.last_triggered_at as string | null) ?? null,
  };
}

export function mapAutomationTriggerRow(row: Record<string, unknown>): AutomationTrigger {
  return {
    id: row.id as string,
    rule_id: row.rule_id as string,
    trigger_reason: row.trigger_reason as string,
    trigger_snapshot: (row.trigger_snapshot as Record<string, unknown>) ?? {},
    generated_action_id: (row.generated_action_id as string | null) ?? null,
    generated_plan_id: (row.generated_plan_id as string | null) ?? null,
    status: row.status as AutomationTrigger["status"],
    created_at: row.created_at as string,
  };
}

export function mapAutomationHistoryRow(row: Record<string, unknown>): AutomationHistoryEntry {
  return {
    id: row.id as string,
    rule_id: (row.rule_id as string | null) ?? null,
    trigger_id: (row.trigger_id as string | null) ?? null,
    event_type: row.event_type as string,
    summary: row.summary as string,
    details: (row.details as Record<string, unknown>) ?? {},
    actor_id: (row.actor_id as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export async function appendAutomationHistory(
  supabase: SupabaseClient,
  input: {
    rule_id?: string | null;
    trigger_id?: string | null;
    event_type: AutomationHistoryEntry["event_type"];
    summary: string;
    details?: Record<string, unknown>;
    actor_id?: string | null;
  },
) {
  const { error } = await supabase.from("nexus_automation_history").insert({
    rule_id: input.rule_id ?? null,
    trigger_id: input.trigger_id ?? null,
    event_type: input.event_type,
    summary: input.summary,
    details: input.details ?? {},
    actor_id: input.actor_id ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function listAutomationRules(
  supabase: SupabaseClient,
  limit = 50,
): Promise<AutomationRule[]> {
  const { data, error } = await supabase
    .from("nexus_automation_rules")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapAutomationRuleRow);
}

export async function getAutomationRuleById(
  supabase: SupabaseClient,
  ruleId: string,
): Promise<AutomationRule | null> {
  const { data, error } = await supabase
    .from("nexus_automation_rules")
    .select("*")
    .eq("id", ruleId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAutomationRuleRow(data as Record<string, unknown>) : null;
}

export async function createAutomationRule(
  supabase: SupabaseClient,
  ownerId: string,
  input: CreateAutomationRuleInput,
): Promise<AutomationRule> {
  const templateInput = input.template_id
    ? buildRuleInputFromTemplate(input.template_id, input)
    : input;

  const payload = templateInput ?? input;
  if (!payload.name || !payload.condition_type || !payload.output_config) {
    throw new Error("name, condition_type, and output_config are required.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("nexus_automation_rules")
    .insert({
      name: payload.name,
      description: payload.description ?? "",
      category: payload.category ?? "custom",
      condition_type: payload.condition_type,
      condition_config: payload.condition_config ?? {},
      output_type: "bundle",
      output_config: payload.output_config,
      status: payload.status ?? "draft",
      created_by: ownerId,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create automation rule.");
  }

  const rule = mapAutomationRuleRow(data as Record<string, unknown>);
  await appendAutomationHistory(supabase, {
    rule_id: rule.id,
    event_type: "rule_created",
    summary: `Created automation rule: ${rule.name}`,
    actor_id: ownerId,
    details: { status: rule.status, template_id: input.template_id ?? null },
  });

  await logNexusActivity({
    actorId: ownerId,
    actorType: "owner",
    action: "automation_studio.rule.created",
    targetType: "nexus_automation_rule",
    targetId: rule.id,
    details: { name: rule.name, status: rule.status },
  });

  return rule;
}

export async function updateAutomationRule(
  supabase: SupabaseClient,
  ownerId: string,
  ruleId: string,
  input: UpdateAutomationRuleInput,
): Promise<AutomationRule> {
  const existing = await getAutomationRuleById(supabase, ruleId);
  if (!existing) {
    throw new Error("Automation rule not found.");
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.name != null) updates.name = input.name;
  if (input.description != null) updates.description = input.description;
  if (input.status != null) updates.status = input.status;
  if (input.condition_config != null) updates.condition_config = input.condition_config;
  if (input.output_config != null) updates.output_config = input.output_config;

  const { data, error } = await supabase
    .from("nexus_automation_rules")
    .update(updates)
    .eq("id", ruleId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update automation rule.");
  }

  const rule = mapAutomationRuleRow(data as Record<string, unknown>);
  const eventType =
    input.status === "active"
      ? "rule_enabled"
      : input.status === "paused"
        ? "rule_paused"
        : input.status === "disabled"
          ? "rule_disabled"
          : "rule_updated";

  await appendAutomationHistory(supabase, {
    rule_id: rule.id,
    event_type: eventType,
    summary: `Updated automation rule: ${rule.name}`,
    actor_id: ownerId,
    details: { status: rule.status },
  });

  return rule;
}

export async function listAutomationTriggers(
  supabase: SupabaseClient,
  limit = 30,
): Promise<AutomationTrigger[]> {
  const { data, error } = await supabase
    .from("nexus_automation_triggers")
    .select("*, nexus_automation_rules(id, name, category, status)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const trigger = mapAutomationTriggerRow(row);
    const rule = row.nexus_automation_rules as Record<string, unknown> | null;
    if (rule) {
      trigger.rule = {
        id: rule.id as string,
        name: rule.name as string,
        category: rule.category as AutomationRule["category"],
        status: rule.status as AutomationRule["status"],
      };
    }
    return trigger;
  });
}

export async function listAutomationHistory(
  supabase: SupabaseClient,
  limit = 50,
): Promise<AutomationHistoryEntry[]> {
  const { data, error } = await supabase
    .from("nexus_automation_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapAutomationHistoryRow);
}
