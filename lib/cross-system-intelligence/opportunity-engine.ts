import { METRIC_KEYS } from "@/lib/metrics/types";
import { clampScore, stablePercentChange } from "@/lib/nexus/scoring";
import type { CrossSystemContext } from "@/lib/cross-system-intelligence/context";
import type { CrossSystemInsight } from "@/lib/cross-system-intelligence/types";

function trendChange(context: CrossSystemContext, key: string): number | null {
  const trend = context.intelligence.trends[key];
  if (!trend) return null;
  return stablePercentChange(trend.current, trend.previous);
}

export function buildCrossSystemOpportunities(context: CrossSystemContext): CrossSystemInsight[] {
  const generatedAt = context.generated_at;
  const opportunities: CrossSystemInsight[] = [];

  const signupsChange = trendChange(context, METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY);
  if (signupsChange != null && signupsChange >= 10) {
    opportunities.push({
      id: "opportunity:signup-momentum",
      insight_type: "opportunity",
      domain: "membership",
      title: "Membership signups are accelerating",
      summary: `Weekly signups increased ${Math.round(signupsChange)}%.`,
      explanation:
        "Acquisition momentum is positive. This is a strong window for onboarding messaging, referral campaigns, and Blackcard conversion pushes.",
      confidence_score: clampScore(80),
      impact_score: clampScore(78),
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/actions"],
      suggested_action_type: "new_member_onboarding_message",
      generated_at: generatedAt,
    });
  }

  const postsChange = trendChange(context, METRIC_KEYS.ACTIVITY_POSTS_WEEKLY);
  if (postsChange != null && postsChange >= 12) {
    opportunities.push({
      id: "opportunity:community-visibility",
      insight_type: "opportunity",
      domain: "platform",
      title: "Community posting momentum increased",
      summary: `Weekly posts rose ${Math.round(postsChange)}%.`,
      explanation:
        "Higher community visibility supports launch narrative, shop discovery, and Blackcard social proof.",
      confidence_score: clampScore(74),
      impact_score: clampScore(70),
      related_routes: ["/admin/nexus/metrics"],
      suggested_action_type: "community_update",
      generated_at: generatedAt,
    });
  }

  const blackcardChange = trendChange(context, METRIC_KEYS.BLACKCARD_ACTIVE);
  if (blackcardChange != null && blackcardChange >= 8) {
    opportunities.push({
      id: "opportunity:blackcard-growth",
      insight_type: "opportunity",
      domain: "membership",
      title: "Blackcard adoption is gaining momentum",
      summary: `Blackcard members increased ${Math.round(blackcardChange)}%.`,
      explanation:
        "Conversion tailwinds are present. A launch or founder update can amplify the current Blackcard growth curve.",
      confidence_score: clampScore(78),
      impact_score: clampScore(80),
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/actions"],
      suggested_action_type: "launch_announcement",
      generated_at: generatedAt,
    });
  }

  const credits = context.credits;
  if (
    credits.redemptions_this_week != null &&
    credits.redemptions_previous_week != null &&
    credits.redemptions_previous_week > 0
  ) {
    const redemptionChange = stablePercentChange(
      credits.redemptions_this_week,
      credits.redemptions_previous_week,
    );
    if (redemptionChange != null && redemptionChange >= 12) {
      opportunities.push({
        id: "opportunity:credits-demand",
        insight_type: "opportunity",
        domain: "credits",
        title: "Crimson Credits reward demand is rising",
        summary: `Redemptions increased ${Math.round(redemptionChange)}% week over week.`,
        explanation:
          "Members are actively using the credits economy. Consider spotlighting high-demand rewards or pairing credits with a shop drop.",
        confidence_score: clampScore(72),
        impact_score: clampScore(68),
        related_routes: ["/admin/rewards", "/admin/credits"],
        suggested_action_type: "shop_drop_announcement",
        generated_at: generatedAt,
      });
    }
  }

  if (!context.action_center.has_recent_launch_announcement) {
    opportunities.push({
      id: "opportunity:launch-campaign-gap",
      insight_type: "opportunity",
      domain: "founder",
      title: "No recent launch announcement prepared",
      summary: "Action Center has no launch announcement draft in the last 14 days.",
      explanation:
        "A prepared launch announcement can convert current Platform Status momentum into member excitement without automatic publishing.",
      confidence_score: clampScore(68),
      impact_score: clampScore(66),
      related_routes: ["/admin/nexus/actions", "/admin/nexus/mission-control"],
      suggested_action_type: "launch_announcement",
      generated_at: generatedAt,
    });
  }

  return opportunities.sort(
    (a, b) => b.impact_score - a.impact_score || b.confidence_score - a.confidence_score,
  );
}
