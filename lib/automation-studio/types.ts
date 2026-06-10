import type { NexusActionType } from "@/lib/action-center/types";
import type { OperationsPlanType } from "@/lib/operations-planner/types";

export const NEXUS_AUTOMATION_STUDIO_PHASE = 16;

export const AUTOMATION_RULE_STATUSES = ["draft", "active", "paused", "disabled"] as const;
export type AutomationRuleStatus = (typeof AUTOMATION_RULE_STATUSES)[number];

export const AUTOMATION_TRIGGER_STATUSES = [
  "triggered",
  "needs_approval",
  "dismissed",
  "approved",
] as const;
export type AutomationTriggerStatus = (typeof AUTOMATION_TRIGGER_STATUSES)[number];

export const AUTOMATION_RULE_CATEGORIES = [
  "growth",
  "launch",
  "shop",
  "community",
  "platform_risk",
  "custom",
] as const;
export type AutomationRuleCategory = (typeof AUTOMATION_RULE_CATEGORIES)[number];

export const AUTOMATION_CONDITION_TYPES = [
  "blackcard_conversion_drop",
  "launch_readiness_below",
  "shop_inventory_low",
  "signup_increase_percent",
  "platform_health_degraded",
] as const;
export type AutomationConditionType = (typeof AUTOMATION_CONDITION_TYPES)[number];

export type AutomationOutputKind =
  | "action_draft"
  | "operations_plan"
  | "owner_note"
  | "weekly_report";

export type AutomationOutputSpec =
  | {
      kind: "action_draft";
      action_type: NexusActionType;
      transcript?: string;
    }
  | {
      kind: "operations_plan";
      plan_type: OperationsPlanType;
      transcript: string;
    }
  | {
      kind: "owner_note";
      title: string;
      summary: string;
    }
  | {
      kind: "weekly_report";
    };

export type AutomationOutputConfig = {
  outputs: AutomationOutputSpec[];
};

export type AutomationRule = {
  id: string;
  name: string;
  description: string;
  category: AutomationRuleCategory;
  condition_type: AutomationConditionType;
  condition_config: Record<string, unknown>;
  output_type: string;
  output_config: AutomationOutputConfig;
  status: AutomationRuleStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
  last_triggered_at: string | null;
};

export type AutomationTrigger = {
  id: string;
  rule_id: string;
  trigger_reason: string;
  trigger_snapshot: Record<string, unknown>;
  generated_action_id: string | null;
  generated_plan_id: string | null;
  status: AutomationTriggerStatus;
  created_at: string;
  rule?: Pick<AutomationRule, "id" | "name" | "category" | "status">;
};

export type AutomationHistoryEntry = {
  id: string;
  rule_id: string | null;
  trigger_id: string | null;
  event_type: string;
  summary: string;
  details: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

export type AutomationConditionResult = {
  met: boolean;
  reason: string;
  snapshot: Record<string, unknown>;
};

export type AutomationEvaluationResult = {
  rule_id: string;
  checked_at: string;
  condition_met: boolean;
  triggered: boolean;
  trigger_id?: string;
  reason: string;
  outputs_prepared: string[];
};

export type AutomationStudioSummary = {
  collected_at: string;
  readOnly: boolean;
  active_rules: AutomationRule[];
  suggested_rules: AutomationTemplateSuggestion[];
  recent_triggers: AutomationTrigger[];
  history: AutomationHistoryEntry[];
  counts: {
    active: number;
    paused: number;
    draft: number;
    needs_approval: number;
  };
};

export type AutomationTemplateSuggestion = {
  template_id: string;
  name: string;
  description: string;
  category: AutomationRuleCategory;
  condition_type: AutomationConditionType;
  currently_relevant: boolean;
  relevance_reason: string;
};

export type CreateAutomationRuleInput = {
  template_id?: string;
  name?: string;
  description?: string;
  category?: AutomationRuleCategory;
  condition_type?: AutomationConditionType;
  condition_config?: Record<string, unknown>;
  output_config?: AutomationOutputConfig;
  status?: AutomationRuleStatus;
};

export type UpdateAutomationRuleInput = {
  name?: string;
  description?: string;
  status?: AutomationRuleStatus;
  condition_config?: Record<string, unknown>;
  output_config?: AutomationOutputConfig;
};
