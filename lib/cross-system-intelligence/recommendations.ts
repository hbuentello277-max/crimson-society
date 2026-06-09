import type { NexusActionType } from "@/lib/action-center/types";
import type { CrossSystemInsight, CrossSystemRecommendation } from "@/lib/cross-system-intelligence/types";

const ACTION_LABELS: Partial<Record<NexusActionType, string>> = {
  blackcard_promotion: "Create Blackcard promotion",
  blackcard_conversion_campaign: "Create Blackcard conversion campaign",
  launch_announcement: "Create launch announcement",
  founder_update: "Prepare founder update",
  community_update: "Draft community update",
  referral_campaign_draft: "Draft referral campaign",
  shop_drop_announcement: "Draft shop drop announcement",
  new_member_onboarding_message: "Draft new member onboarding message",
  incident_summary: "Draft incident summary",
  weekly_report: "Create weekly report",
};

export function buildCrossSystemRecommendations(
  insights: CrossSystemInsight[],
  generatedAt: string,
): CrossSystemRecommendation[] {
  const recommendations: CrossSystemRecommendation[] = [];
  const seenActions = new Set<NexusActionType>();

  for (const insight of insights) {
    if (!insight.suggested_action_type || seenActions.has(insight.suggested_action_type)) {
      continue;
    }

    seenActions.add(insight.suggested_action_type);
    const label =
      ACTION_LABELS[insight.suggested_action_type] ??
      `Prepare ${insight.suggested_action_type.replaceAll("_", " ")}`;

    recommendations.push({
      id: `recommendation:${insight.suggested_action_type}`,
      title: label,
      summary: insight.summary,
      reason: insight.explanation,
      suggested_action_type: insight.suggested_action_type,
      source_insight_id: insight.id,
      related_routes: ["/admin/nexus/actions", ...insight.related_routes],
      generated_at: generatedAt,
    });
  }

  return recommendations.slice(0, 6);
}
