import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTION_TYPE_LABELS, actionCategoryForType } from "@/lib/action-center/constants";
import type { NexusActionCard, NexusActionType } from "@/lib/action-center/types";
import { getFounderBriefing } from "@/lib/founder-copilot/briefing";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { computeLaunchReadiness } from "@/lib/proactive-intelligence/launch-readiness";
import { buildFounderPriorityEngine } from "@/lib/proactive-intelligence/priority-engine";
import { detectProactiveAlerts } from "@/lib/proactive-intelligence/proactive-alerts";

export type ActionGenerationContext = {
  briefing: Awaited<ReturnType<typeof getFounderBriefing>>;
  launchReadiness: Awaited<ReturnType<typeof computeLaunchReadiness>>;
  priorityIssue: string | null;
  memoryHints: string[];
};

export async function loadActionGenerationContext(
  supabase: SupabaseClient,
): Promise<ActionGenerationContext> {
  const [briefing, launchReadiness, proactive, memorySummary] = await Promise.all([
    getFounderBriefing(supabase),
    computeLaunchReadiness(supabase),
    detectProactiveAlerts(supabase),
    getNexusMemorySummary(supabase, { limit: 2 }),
  ]);
  const memoryHints = memorySummary.entries.map(
    (entry) => `${entry.title}: ${entry.summary}`,
  );

  const priority = await buildFounderPriorityEngine(supabase, proactive.alerts);

  return {
    briefing,
    launchReadiness,
    priorityIssue: priority.highestPriorityIssue?.title ?? null,
    memoryHints,
  };
}

function memoryLine(hints: string[]): string {
  return hints.length > 0 ? `\n\nMemory context: ${hints.join(" ")}` : "";
}

function buildGeneratedContent(
  actionType: NexusActionType,
  context: ActionGenerationContext,
): { reason: string; suggested_outcome: string; generated_content: string } {
  const { briefing, launchReadiness, priorityIssue, memoryHints } = context;
  const members = briefing.membershipGrowth.newUsersThisWeek ?? briefing.membershipGrowth.totalUsers;
  const blackcard = briefing.blackcardGrowth.activeMembers;
  const revenue = briefing.revenueSummary.revenueToday ?? "n/a";
  const platformLine = `Platform Health score ${briefing.platformHealth.missionScore ?? "n/a"} · Platform Status ${briefing.platformHealth.status}`;
  const memory = memoryLine(memoryHints);

  switch (actionType) {
    case "launch_announcement":
      return {
        reason: `Launch readiness is ${launchReadiness.score}/100 (${launchReadiness.status}).`,
        suggested_outcome: "Communicate launch momentum while setting clear expectations on remaining validation.",
        generated_content: `Launch announcement draft\n\nHeadline: Crimson Society is approaching launch readiness (${launchReadiness.score}/100).\n\nBody:\nWe are preparing for a broader launch push. ${platformLine}. Membership this week: ${members ?? "n/a"}. Blackcard members: ${blackcard ?? "n/a"}.\n\nNext steps for members:\n- Explore the latest community experiences\n- Watch for launch-week updates\n\nFounder note: review Platform Status before publishing.${memory}`,
      };
    case "blackcard_promotion":
    case "blackcard_conversion_campaign":
      return {
        reason: `Blackcard members: ${blackcard ?? "n/a"} with revenue today at ${revenue}.`,
        suggested_outcome: "Increase Blackcard conversion with a focused annual-first offer.",
        generated_content: `Blackcard promotion draft\n\nHeadline: Unlock the full Crimson Society experience with Blackcard.\n\nOffer framing:\n- Annual-first value for committed members\n- Priority access to meets, rewards, and founder updates\n\nWhy now:\n${platformLine}. Conversion momentum matters ahead of launch readiness ${launchReadiness.score}/100.\n\nCTA: Review Blackcard positioning before sending.${memory}`,
      };
    case "founder_update":
      return {
        reason: priorityIssue
          ? `Top platform signal: ${priorityIssue}.`
          : "Weekly founder update cadence keeps members aligned with platform progress.",
        suggested_outcome: "Share transparent progress on platform stability, growth, and launch readiness.",
        generated_content: `Founder update draft\n\nThis week at Crimson Society:\n- ${platformLine}\n- Membership this week: ${members ?? "n/a"}\n- Blackcard members: ${blackcard ?? "n/a"}\n- Revenue today: ${revenue}\n- Launch readiness: ${launchReadiness.score}/100\n\nPriority focus:\n${priorityIssue ?? "Maintain Platform Status review and clear any open alerts."}\n\nThank you for building with us.${memory}`,
      };
    case "weekly_report":
      return {
        reason: "Weekly operational snapshot helps the founder review platform trajectory.",
        suggested_outcome: "Review metrics, risks, and next actions before the next operating week.",
        generated_content: `Weekly report draft\n\nPlatform Health: ${briefing.platformHealth.missionScore ?? "n/a"} (${briefing.platformHealth.status})\nCritical alerts: ${briefing.openAlerts.critical}\nFailed platform jobs: ${briefing.failedPlatformJobs.failedCount}\nPending reports: ${briefing.pendingReports}\nMembership this week: ${members ?? "n/a"}\nBlackcard members: ${blackcard ?? "n/a"}\nRevenue today: ${revenue}\nLaunch readiness: ${launchReadiness.score}/100\n\nRecommended follow-up:\n${briefing.recommendedActions.slice(0, 3).join("\n") || "Review Platform Status."}${memory}`,
      };
    case "monthly_report":
      return {
        reason: "Monthly founder review consolidates growth, revenue, and launch posture.",
        suggested_outcome: "Use this report for strategic decisions and approval planning.",
        generated_content: `Monthly report draft\n\nMonth in review:\n- Platform Health: ${briefing.platformHealth.missionScore ?? "n/a"}\n- Membership total: ${briefing.membershipGrowth.totalUsers ?? "n/a"}\n- Blackcard members: ${blackcard ?? "n/a"}\n- Estimated MRR signal: ${briefing.revenueSummary.estimatedMrr ?? "n/a"}\n- Launch readiness: ${launchReadiness.score}/100 (${launchReadiness.status})\n\nRisks:\n${priorityIssue ?? "No single risk is dominating the signal stack."}\n\nApproval required before external distribution.${memory}`,
      };
    case "instagram_caption":
      return {
        reason: "Social content should reflect current growth and launch momentum.",
        suggested_outcome: "Publish a concise Instagram caption aligned with current platform story.",
        generated_content: `Instagram caption draft\n\nCrimson Society is building in public.\n\nThis week: ${members ?? "steady"} new members, Blackcard growing, and launch readiness at ${launchReadiness.score}/100.\n\n${platformLine}.\n\n#CrimsonSociety #FounderMode #Community${memory}`,
      };
    case "tiktok_caption":
      return {
        reason: "Short-form content can highlight community momentum and Blackcard value.",
        suggested_outcome: "Drive curiosity with a concise TikTok caption and clear CTA.",
        generated_content: `TikTok caption draft\n\nPOV: your founder copilot says launch readiness is ${launchReadiness.score}/100.\n\nMembers are joining. Blackcard is growing. Platform Health is ${briefing.platformHealth.status}.\n\nTap in. Build with us.${memory}`,
      };
    case "community_update":
      return {
        reason: `Community health depends on transparent updates while Platform Status is ${briefing.platformHealth.status}.`,
        suggested_outcome: "Keep members informed without overpromising on unfinished systems.",
        generated_content: `Community update draft\n\nTeam — here is what matters this week:\n- ${platformLine}\n- Launch readiness: ${launchReadiness.score}/100\n- Open critical alerts: ${briefing.openAlerts.critical}\n\nWhat we are focused on:\n${briefing.recommendedActions[0] ?? "Maintaining platform stability and member trust."}${memory}`,
      };
    case "admin_briefing_draft":
    case "incident_summary":
    case "founder_review_checklist":
    case "referral_campaign_draft":
    case "new_member_onboarding_message":
    case "beta_tester_recruitment_campaign":
    case "platform_announcement":
    case "meet_announcement":
    case "maintenance_notice":
    case "youtube_description":
    case "email_campaign_draft":
    case "shop_drop_announcement":
    default:
      return {
        reason: priorityIssue
          ? `${priorityIssue} is the highest-priority platform signal right now.`
          : `${ACTION_TYPE_LABELS[actionType]} prepared from current platform signals.`,
        suggested_outcome: `Review and approve this ${ACTION_TYPE_LABELS[actionType].toLowerCase()} before any manual publish step.`,
        generated_content: `${ACTION_TYPE_LABELS[actionType]} draft\n\nSummary:\n${platformLine}\nMembership this week: ${members ?? "n/a"}\nBlackcard members: ${blackcard ?? "n/a"}\nRevenue today: ${revenue}\nLaunch readiness: ${launchReadiness.score}/100\n\nDraft body:\nNEXUS prepared this action from Platform Status, Platform Health, launch readiness, and founder memory. Edit before approval. No automatic posting, email, or credit changes will occur.${memory}`,
      };
  }
}

export async function buildActionCardDraft(
  supabase: SupabaseClient,
  actionType: NexusActionType,
  options?: { transcript?: string },
): Promise<Omit<NexusActionCard, "id" | "created_at" | "updated_at">> {
  const context = await loadActionGenerationContext(supabase);
  const generated = buildGeneratedContent(actionType, context);
  const label = ACTION_TYPE_LABELS[actionType];

  return {
    action_category: actionCategoryForType(actionType),
    action_type: actionType,
    title: label,
    summary: `NEXUS prepared a ${label.toLowerCase()} for founder review.`,
    reason: generated.reason,
    suggested_outcome: generated.suggested_outcome,
    generated_content: generated.generated_content,
    status: "pending_approval",
    approval_required: true,
    created_by_label: "NEXUS",
    created_by_user_id: null,
    approved_at: null,
    approved_by: null,
    executed_at: null,
    executed_by: null,
    rejected_at: null,
    rejected_by: null,
    metadata: {
      source: "nexus_action_center",
      transcript: options?.transcript?.trim() || null,
      dedupe_key: `action:${actionType}:${new Date().toISOString().slice(0, 10)}`,
    },
  };
}
