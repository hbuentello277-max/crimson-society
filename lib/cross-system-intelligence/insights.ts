import type { CrossSystemCorrelation } from "@/lib/cross-system-intelligence/types";
import type { CrossSystemInsight } from "@/lib/cross-system-intelligence/types";

export function buildCrossSystemInsights(input: {
  risks: CrossSystemInsight[];
  opportunities: CrossSystemInsight[];
  correlations: CrossSystemCorrelation[];
  generated_at: string;
}): CrossSystemInsight[] {
  const correlationInsights: CrossSystemInsight[] = input.correlations.map((correlation) => ({
    id: `insight:correlation:${correlation.id}`,
    insight_type: "correlation",
    domain: correlation.domain,
    title: correlation.title,
    summary: correlation.summary,
    explanation: correlation.explanation,
    confidence_score: correlation.confidence_score,
    impact_score: correlation.impact_score,
    related_routes: correlation.related_routes,
    suggested_action_type: inferActionTypeFromCorrelation(correlation.id),
    generated_at: input.generated_at,
  }));

  const combined = [...input.risks, ...input.opportunities, ...correlationInsights];
  const seen = new Set<string>();
  const deduped: CrossSystemInsight[] = [];

  for (const item of combined) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  return deduped.sort(
    (a, b) => b.impact_score - a.impact_score || b.confidence_score - a.confidence_score,
  );
}

function inferActionTypeFromCorrelation(id: string) {
  if (id.includes("revenue-blackcard")) return "blackcard_conversion_campaign" as const;
  if (id.includes("blackcard-social")) return "blackcard_promotion" as const;
  if (id.includes("signup-revenue")) return "referral_campaign_draft" as const;
  if (id.includes("credits-demand")) return "shop_drop_announcement" as const;
  return undefined;
}
