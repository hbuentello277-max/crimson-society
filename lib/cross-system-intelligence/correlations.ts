import { METRIC_KEYS } from "@/lib/metrics/types";
import { clampScore, stablePercentChange } from "@/lib/nexus/scoring";
import type { CrossSystemContext } from "@/lib/cross-system-intelligence/context";
import type { CrossSystemCorrelation } from "@/lib/cross-system-intelligence/types";

function trendChange(context: CrossSystemContext, key: string): number | null {
  const trend = context.intelligence.trends[key];
  if (!trend) return null;
  return stablePercentChange(trend.current, trend.previous);
}

function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "n/a";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function buildCrossSystemCorrelations(context: CrossSystemContext): CrossSystemCorrelation[] {
  const generatedAt = context.generated_at;
  const items: CrossSystemCorrelation[] = [];

  const mrrChange = trendChange(context, METRIC_KEYS.REVENUE_MRR);
  const blackcardChange = trendChange(context, METRIC_KEYS.BLACKCARD_ACTIVE);
  const signupsChange = trendChange(context, METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY);
  const postsChange = trendChange(context, METRIC_KEYS.ACTIVITY_POSTS_WEEKLY);

  if (
    mrrChange != null &&
    mrrChange < -5 &&
    (blackcardChange == null || blackcardChange < 0) &&
    (postsChange == null || postsChange < 0)
  ) {
    items.push({
      id: "revenue-blackcard-engagement-decline",
      domain: "revenue",
      title: "Revenue decline linked to conversion and visibility",
      summary: `Revenue declined ${formatPct(mrrChange)} while Blackcard and community activity softened.`,
      explanation: [
        `Revenue declined ${formatPct(mrrChange)}.`,
        blackcardChange != null
          ? `Blackcard conversions moved ${formatPct(blackcardChange)}.`
          : "Blackcard conversion trend is unavailable.",
        postsChange != null
          ? `Community posting fell ${formatPct(Math.abs(postsChange))}.`
          : "Community posting trend is unavailable.",
        !context.action_center.has_recent_launch_announcement
          ? "No launch announcement was prepared in Action Center during the last 14 days."
          : null,
        !context.action_center.has_recent_blackcard_campaign
          ? "No Blackcard promotion draft was prepared in Action Center during the last 14 days."
          : null,
      ]
        .filter(Boolean)
        .join(" "),
      signals: [
        {
          label: "Revenue MRR trend",
          value: formatPct(mrrChange),
          source: "Stripe metrics",
          direction: "down",
        },
        {
          label: "Blackcard members trend",
          value: formatPct(blackcardChange),
          source: "Blackcard",
          direction: blackcardChange != null && blackcardChange < 0 ? "down" : "unknown",
        },
        {
          label: "Weekly posts trend",
          value: formatPct(postsChange),
          source: "Supabase activity",
          direction: postsChange != null && postsChange < 0 ? "down" : "unknown",
        },
      ],
      confidence_score: clampScore(78),
      impact_score: clampScore(88),
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/actions", "/admin/nexus/mission-control"],
      generated_at: generatedAt,
    });
  }

  const latestDeployment = context.correlations.deployments[0];
  if (
    latestDeployment &&
    (context.correlations.post_deployment_incidents > 0 ||
      context.correlations.post_deployment_critical_alerts > 0)
  ) {
    items.push({
      id: "deployment-user-impact",
      domain: "deployment",
      title: "Post-deployment platform signals shifted",
      summary: "The latest production deployment coincides with elevated incidents or alerts.",
      explanation: `After the latest Vercel deployment (${latestDeployment.commit_message?.slice(0, 80) ?? "production deploy"}), Nexus recorded ${context.correlations.post_deployment_incidents} incident(s) and ${context.correlations.post_deployment_critical_alerts} critical alert(s) within 24 hours. Review Platform Health and Platform Status to confirm user impact.`,
      signals: [
        {
          label: "Deployment",
          value: latestDeployment.status,
          source: "Vercel",
          direction: "unknown",
        },
        {
          label: "Incidents after deploy",
          value: String(context.correlations.post_deployment_incidents),
          source: "Nexus incidents",
          direction: context.correlations.post_deployment_incidents > 0 ? "up" : "flat",
        },
        {
          label: "Critical alerts after deploy",
          value: String(context.correlations.post_deployment_critical_alerts),
          source: "Nexus alerts",
          direction:
            context.correlations.post_deployment_critical_alerts > 0 ? "up" : "flat",
        },
      ],
      confidence_score: clampScore(84),
      impact_score: clampScore(82),
      related_routes: ["/admin/nexus/system-health", "/admin/nexus/incidents", "/admin/nexus/alerts"],
      generated_at: generatedAt,
    });
  }

  if (
    blackcardChange != null &&
    blackcardChange < -5 &&
    postsChange != null &&
    postsChange < -10
  ) {
    items.push({
      id: "blackcard-social-correlation",
      domain: "membership",
      title: "Blackcard growth slowed as social posting declined",
      summary: "Blackcard momentum and community visibility are moving in the same direction.",
      explanation: `Blackcard member trend moved ${formatPct(blackcardChange)} while weekly posts fell ${formatPct(Math.abs(postsChange))}. Reduced social visibility can slow Blackcard consideration even when product fundamentals remain stable.`,
      signals: [
        {
          label: "Blackcard members",
          value: formatPct(blackcardChange),
          source: "Blackcard",
          direction: "down",
        },
        {
          label: "Weekly posts",
          value: formatPct(postsChange),
          source: "Supabase",
          direction: "down",
        },
      ],
      confidence_score: clampScore(76),
      impact_score: clampScore(74),
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/correlations"],
      generated_at: generatedAt,
    });
  }

  if (signupsChange != null && signupsChange > 10 && (mrrChange == null || mrrChange <= 5)) {
    items.push({
      id: "signup-revenue-gap",
      domain: "membership",
      title: "Membership growth is outpacing monetization",
      summary: "New member signups are rising faster than revenue conversion.",
      explanation: `Weekly signups increased ${formatPct(signupsChange)} while revenue MRR moved ${formatPct(mrrChange)}. Membership demand is healthy, but monetization workflows may need a Blackcard or shop push.`,
      signals: [
        {
          label: "Weekly signups",
          value: formatPct(signupsChange),
          source: "Supabase",
          direction: "up",
        },
        {
          label: "Revenue MRR",
          value: formatPct(mrrChange),
          source: "Stripe",
          direction: mrrChange != null && mrrChange > 0 ? "up" : "flat",
        },
      ],
      confidence_score: clampScore(72),
      impact_score: clampScore(70),
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/mission-control"],
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
    if (redemptionChange != null && redemptionChange > 15) {
      items.push({
        id: "credits-demand-surge",
        domain: "credits",
        title: "Crimson Credits redemption demand increased",
        summary: "Reward redemptions accelerated week over week.",
        explanation: `Redemptions rose ${formatPct(redemptionChange)} versus the prior week with ${credits.active_rewards ?? "n/a"} active rewards in catalog. Monitor inventory and reward availability before demand outpaces supply.`,
        signals: [
          {
            label: "Redemptions this week",
            value: String(credits.redemptions_this_week),
            source: "Crimson Credits",
            direction: "up",
          },
          {
            label: "Week-over-week change",
            value: formatPct(redemptionChange),
            source: "Crimson Credits",
            direction: "up",
          },
        ],
        confidence_score: clampScore(70),
        impact_score: clampScore(68),
        related_routes: ["/admin/rewards", "/admin/credits"],
        generated_at: generatedAt,
      });
    }
  }

  if (context.founder_timeline.recentDecisions.length > 0 && signupsChange != null && signupsChange < 0) {
    const latestDecision = context.founder_timeline.recentDecisions[0];
    items.push({
      id: "founder-decision-growth-link",
      domain: "founder",
      title: "Recent founder decisions may be influencing growth signals",
      summary: "Founder memory shows recent decisions while membership growth softened.",
      explanation: `Recent founder decision "${latestDecision.title}" appears in memory while weekly signups moved ${formatPct(signupsChange)}. Review whether recent operational focus shifted away from acquisition.`,
      signals: [
        {
          label: "Latest founder decision",
          value: latestDecision.title,
          source: "Founder memory",
          direction: "unknown",
        },
        {
          label: "Weekly signups",
          value: formatPct(signupsChange),
          source: "Supabase",
          direction: "down",
        },
      ],
      confidence_score: clampScore(65),
      impact_score: clampScore(66),
      related_routes: ["/admin/nexus/memory", "/admin/nexus/metrics"],
      generated_at: generatedAt,
    });
  }

  return items.sort((a, b) => b.impact_score - a.impact_score || b.confidence_score - a.confidence_score);
}
