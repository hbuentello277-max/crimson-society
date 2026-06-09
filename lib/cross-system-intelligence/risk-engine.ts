import { METRIC_KEYS } from "@/lib/metrics/types";
import { clampScore, stablePercentChange } from "@/lib/nexus/scoring";
import type { CrossSystemContext } from "@/lib/cross-system-intelligence/context";
import type { CrossSystemInsight } from "@/lib/cross-system-intelligence/types";

function trendChange(context: CrossSystemContext, key: string): number | null {
  const trend = context.intelligence.trends[key];
  if (!trend) return null;
  return stablePercentChange(trend.current, trend.previous);
}

export function buildCrossSystemRisks(context: CrossSystemContext): CrossSystemInsight[] {
  const generatedAt = context.generated_at;
  const risks: CrossSystemInsight[] = [];

  for (const alert of context.proactive.alerts) {
    risks.push({
      id: `risk:proactive:${alert.id}`,
      insight_type: "risk",
      domain:
        alert.category === "revenue_drop"
          ? "revenue"
          :         alert.category === "checkout"
            ? "shop"
            : "platform",
      title: alert.title,
      summary: alert.summary,
      explanation: alert.summary,
      confidence_score: clampScore(alert.severity === "critical" ? 88 : 78),
      impact_score: clampScore(alert.severity === "critical" ? 90 : 80),
      related_routes: [alert.relatedRoute ?? "/admin/nexus/alerts"],
      suggested_action_type:
        alert.category === "revenue_drop"
          ? "blackcard_conversion_campaign"
          : alert.category === "checkout"
            ? "incident_summary"
            : undefined,
      generated_at: generatedAt,
    });
  }

  const mrrChange = trendChange(context, METRIC_KEYS.REVENUE_MRR);
  if (mrrChange != null && mrrChange <= -8) {
    risks.push({
      id: "risk:revenue-decline",
      insight_type: "risk",
      domain: "revenue",
      title: "Revenue trend is declining",
      summary: `Estimated MRR moved ${Math.round(mrrChange)}% versus the prior period.`,
      explanation:
        "Stripe and shop signals show monetization softening. Cross-check Blackcard conversion, checkout health, and recent campaign cadence before the decline compounds.",
      confidence_score: clampScore(82),
      impact_score: clampScore(86),
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/mission-control"],
      suggested_action_type: "blackcard_conversion_campaign",
      generated_at: generatedAt,
    });
  }

  const blackcardChange = trendChange(context, METRIC_KEYS.BLACKCARD_ACTIVE);
  if (blackcardChange != null && blackcardChange <= -5) {
    risks.push({
      id: "risk:blackcard-slowdown",
      insight_type: "risk",
      domain: "membership",
      title: "Blackcard growth is slowing",
      summary: `Active Blackcard members moved ${Math.round(blackcardChange)}% week over week.`,
      explanation:
        "Blackcard adoption is decelerating. Review conversion funnel, annual offer positioning, and whether recent community visibility supported the upgrade path.",
      confidence_score: clampScore(80),
      impact_score: clampScore(84),
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/actions"],
      suggested_action_type: "blackcard_promotion",
      generated_at: generatedAt,
    });
  }

  const checkoutAlert = context.proactive.alerts.find((alert) => alert.category === "checkout");
  if (checkoutAlert) {
    risks.push({
      id: "risk:checkout-health",
      insight_type: "risk",
      domain: "shop",
      title: "Checkout failures are elevated",
      summary: checkoutAlert.summary,
      explanation:
        "Shop checkout friction can suppress revenue and reward redemptions. Inspect Stripe checkout health and recent deployment changes.",
      confidence_score: clampScore(85),
      impact_score: clampScore(87),
      related_routes: ["/admin/nexus/mission-health", "/admin/shop"],
      suggested_action_type: "incident_summary",
      generated_at: generatedAt,
    });
  }

  if ((context.intelligence.incidents.open?.length ?? 0) > 0) {
    const openCount = context.intelligence.incidents.open?.length ?? 0;
    risks.push({
      id: "risk:open-incidents",
      insight_type: "risk",
      domain: "platform",
      title: "Open incidents require founder review",
      summary: `${openCount} incident(s) remain open on Platform Health.`,
      explanation:
        "Unresolved incidents can cascade into membership churn, checkout failures, and reduced founder confidence.",
      confidence_score: clampScore(90),
      impact_score: clampScore(88),
      related_routes: ["/admin/nexus/incidents"],
      suggested_action_type: "incident_summary",
      generated_at: generatedAt,
    });
  }

  if (context.action_center.pending_approval > 5) {
    risks.push({
      id: "risk:action-backlog",
      insight_type: "risk",
      domain: "founder",
      title: "Action Center approval backlog is building",
      summary: `${context.action_center.pending_approval} prepared actions are waiting for founder approval.`,
      explanation:
        "Prepared campaigns and updates are stalling in review. Delayed approvals can leave growth and communication gaps open.",
      confidence_score: clampScore(74),
      impact_score: clampScore(72),
      related_routes: ["/admin/nexus/actions"],
      generated_at: generatedAt,
    });
  }

  return risks.sort((a, b) => b.impact_score - a.impact_score || b.confidence_score - a.confidence_score);
}
