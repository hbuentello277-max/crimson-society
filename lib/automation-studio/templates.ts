import type {
  AutomationOutputConfig,
  AutomationRuleCategory,
  AutomationConditionType,
  CreateAutomationRuleInput,
} from "@/lib/automation-studio/types";

export type AutomationRuleTemplate = {
  id: string;
  name: string;
  description: string;
  category: AutomationRuleCategory;
  condition_type: AutomationConditionType;
  condition_config: Record<string, unknown>;
  output_config: AutomationOutputConfig;
};

export const AUTOMATION_RULE_TEMPLATES: AutomationRuleTemplate[] = [
  {
    id: "blackcard_growth",
    name: "Blackcard Growth Automation",
    description:
      "When Blackcard conversion softens, prepare a recovery plan, campaign draft, and founder briefing note.",
    category: "growth",
    condition_type: "blackcard_conversion_drop",
    condition_config: { threshold_percent: 20 },
    output_config: {
      outputs: [
        {
          kind: "operations_plan",
          plan_type: "membership",
          transcript: "Build a Blackcard recovery plan.",
        },
        {
          kind: "action_draft",
          action_type: "blackcard_conversion_campaign",
          transcript: "Prepare Blackcard conversion campaign draft from automation studio.",
        },
        {
          kind: "owner_note",
          title: "Blackcard growth automation briefing",
          summary: "NEXUS detected Blackcard conversion softness and prepared recovery drafts for approval.",
        },
      ],
    },
  },
  {
    id: "launch_protection",
    name: "Launch Protection Automation",
    description:
      "When launch readiness falls below target, prepare blocker report, recovery plan, and priority action draft.",
    category: "launch",
    condition_type: "launch_readiness_below",
    condition_config: { threshold_score: 90 },
    output_config: {
      outputs: [
        {
          kind: "weekly_report",
        },
        {
          kind: "operations_plan",
          plan_type: "launch",
          transcript: "Build a launch recovery plan.",
        },
        {
          kind: "action_draft",
          action_type: "launch_announcement",
          transcript: "Prepare launch priority action draft from automation studio.",
        },
      ],
    },
  },
  {
    id: "shop_inventory",
    name: "Shop Automation",
    description:
      "When shop inventory is low, prepare restock recommendation, shop drop draft, and reorder checklist note.",
    category: "shop",
    condition_type: "shop_inventory_low",
    condition_config: { max_available: 10 },
    output_config: {
      outputs: [
        {
          kind: "owner_note",
          title: "Shop restock recommendation",
          summary: "Inventory is low. Review product availability and prepare a shop drop when ready.",
        },
        {
          kind: "action_draft",
          action_type: "shop_drop_announcement",
          transcript: "Prepare shop drop action draft from automation studio.",
        },
        {
          kind: "owner_note",
          title: "Shop reorder checklist",
          summary: "Check supplier lead times, update inventory counts, and confirm pickup workflow coverage.",
        },
      ],
    },
  },
  {
    id: "community_growth",
    name: "Community Growth Automation",
    description:
      "When signups accelerate, prepare welcome campaign, referral campaign, and community update drafts.",
    category: "community",
    condition_type: "signup_increase_percent",
    condition_config: { threshold_percent: 25 },
    output_config: {
      outputs: [
        {
          kind: "action_draft",
          action_type: "new_member_onboarding_message",
          transcript: "Prepare welcome campaign draft from automation studio.",
        },
        {
          kind: "action_draft",
          action_type: "referral_campaign_draft",
          transcript: "Prepare referral campaign draft from automation studio.",
        },
        {
          kind: "action_draft",
          action_type: "community_update",
          transcript: "Prepare community update draft from automation studio.",
        },
      ],
    },
  },
  {
    id: "platform_risk",
    name: "Platform Risk Automation",
    description:
      "When Platform Health degrades, prepare incident summary, recovery plan, and founder alert draft.",
    category: "platform_risk",
    condition_type: "platform_health_degraded",
    condition_config: { min_score: 70 },
    output_config: {
      outputs: [
        {
          kind: "action_draft",
          action_type: "incident_summary",
          transcript: "Prepare incident summary draft from automation studio.",
        },
        {
          kind: "operations_plan",
          plan_type: "incident",
          transcript: "Build an incident response plan.",
        },
        {
          kind: "action_draft",
          action_type: "founder_update",
          transcript: "Prepare founder alert draft from automation studio.",
        },
      ],
    },
  },
];

export function getAutomationTemplate(templateId: string): AutomationRuleTemplate | undefined {
  return AUTOMATION_RULE_TEMPLATES.find((template) => template.id === templateId);
}

export function buildRuleInputFromTemplate(
  templateId: string,
  overrides: Partial<CreateAutomationRuleInput> = {},
): CreateAutomationRuleInput | null {
  const template = getAutomationTemplate(templateId);
  if (!template) {
    return null;
  }

  return {
    template_id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    condition_type: template.condition_type,
    condition_config: {
      ...template.condition_config,
      template_id: template.id,
    },
    output_config: template.output_config,
    status: "draft",
    ...overrides,
  };
}
