import type { NexusActionType } from "@/lib/action-center/types";
import type { OperationsPlanStep, OperationsPlanType } from "@/lib/operations-planner/types";

type PlanTemplate = {
  title: string;
  objective: string;
  steps: Array<{ title: string; summary: string; suggested_action_type?: NexusActionType }>;
  suggested_drafts: Array<{ action_type: NexusActionType; title: string }>;
};

export const PLAN_TEMPLATES: Record<OperationsPlanType, PlanTemplate> = {
  growth: {
    title: "Growth acceleration plan",
    objective: "Increase qualified member acquisition and community momentum without automatic execution.",
    steps: [
      {
        title: "Review Platform Status and growth signals",
        summary: "Confirm which growth metrics are improving or slowing before committing to campaigns.",
      },
      {
        title: "Prepare referral campaign draft",
        summary: "Draft a referral-focused campaign for founder review in Action Center.",
        suggested_action_type: "referral_campaign_draft",
      },
      {
        title: "Prepare community update",
        summary: "Draft a community update that reinforces momentum and upcoming opportunities.",
        suggested_action_type: "community_update",
      },
      {
        title: "Prepare beta tester recruitment draft",
        summary: "If acquisition needs a quality boost, draft a beta recruitment message for approval.",
        suggested_action_type: "beta_tester_recruitment_campaign",
      },
    ],
    suggested_drafts: [
      { action_type: "referral_campaign_draft", title: "Referral campaign draft" },
      { action_type: "community_update", title: "Community update draft" },
    ],
  },
  revenue: {
    title: "Revenue recovery plan",
    objective: "Stabilize monetization by addressing checkout friction, offer positioning, and founder communication.",
    steps: [
      {
        title: "Review revenue and checkout health",
        summary: "Inspect Stripe, shop checkout, and Platform Health before changing offers.",
      },
      {
        title: "Prepare Blackcard conversion campaign",
        summary: "Draft a conversion-focused Blackcard campaign for founder approval.",
        suggested_action_type: "blackcard_conversion_campaign",
      },
      {
        title: "Prepare shop drop announcement",
        summary: "If merch demand is part of recovery, draft a shop drop announcement for review.",
        suggested_action_type: "shop_drop_announcement",
      },
      {
        title: "Prepare founder update",
        summary: "Draft a transparent founder update explaining revenue recovery priorities.",
        suggested_action_type: "founder_update",
      },
    ],
    suggested_drafts: [
      { action_type: "blackcard_conversion_campaign", title: "Blackcard conversion campaign" },
      { action_type: "founder_update", title: "Founder update draft" },
    ],
  },
  membership: {
    title: "Membership growth plan",
    objective: "Improve member acquisition, onboarding quality, and Blackcard conversion readiness.",
    steps: [
      {
        title: "Review membership and Blackcard trends",
        summary: "Compare weekly signups, active profiles, and Blackcard conversion signals.",
      },
      {
        title: "Prepare new member onboarding message",
        summary: "Draft an onboarding message that improves early retention and upgrade clarity.",
        suggested_action_type: "new_member_onboarding_message",
      },
      {
        title: "Prepare Blackcard promotion",
        summary: "Draft a Blackcard promotion tailored to current membership momentum.",
        suggested_action_type: "blackcard_promotion",
      },
      {
        title: "Prepare weekly report",
        summary: "Generate a weekly operational report for founder review before the next operating cycle.",
        suggested_action_type: "weekly_report",
      },
    ],
    suggested_drafts: [
      { action_type: "new_member_onboarding_message", title: "New member onboarding message" },
      { action_type: "blackcard_promotion", title: "Blackcard promotion draft" },
    ],
  },
  launch: {
    title: "Launch readiness plan",
    objective: "Close launch blockers and prepare approval-ready launch communications.",
    steps: [
      {
        title: "Review Platform Status and launch readiness",
        summary: "Validate launch blockers, Platform Health, and open incidents before announcing.",
      },
      {
        title: "Prepare launch announcement",
        summary: "Draft a launch announcement for founder approval in Action Center.",
        suggested_action_type: "launch_announcement",
      },
      {
        title: "Prepare platform announcement",
        summary: "Draft a broader platform announcement aligned with launch readiness.",
        suggested_action_type: "platform_announcement",
      },
      {
        title: "Prepare founder review checklist",
        summary: "Create a founder review checklist to confirm launch approvals remain manual.",
        suggested_action_type: "founder_review_checklist",
      },
    ],
    suggested_drafts: [
      { action_type: "launch_announcement", title: "Launch announcement draft" },
      { action_type: "founder_review_checklist", title: "Founder review checklist" },
    ],
  },
  incident: {
    title: "Incident response plan",
    objective: "Contain operational impact, communicate clearly, and prepare recovery actions for approval.",
    steps: [
      {
        title: "Review open incidents and Platform Health",
        summary: "Confirm incident scope, severity, and affected workflows before drafting communications.",
      },
      {
        title: "Prepare incident summary",
        summary: "Draft an incident summary for founder review and internal alignment.",
        suggested_action_type: "incident_summary",
      },
      {
        title: "Prepare maintenance notice",
        summary: "If member-facing communication is needed, draft a maintenance notice for approval.",
        suggested_action_type: "maintenance_notice",
      },
      {
        title: "Prepare admin briefing draft",
        summary: "Draft an admin briefing that documents response steps and current status.",
        suggested_action_type: "admin_briefing_draft",
      },
    ],
    suggested_drafts: [
      { action_type: "incident_summary", title: "Incident summary draft" },
      { action_type: "maintenance_notice", title: "Maintenance notice draft" },
    ],
  },
};

export function templateStepsForType(planType: OperationsPlanType): OperationsPlanStep[] {
  return PLAN_TEMPLATES[planType].steps.map((step, index) => ({
    order: index + 1,
    title: step.title,
    summary: step.summary,
    suggested_action_type: step.suggested_action_type,
  }));
}
