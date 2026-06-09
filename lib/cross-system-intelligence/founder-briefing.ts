import type {
  CrossSystemCorrelation,
  CrossSystemInsight,
  CrossSystemRecommendation,
  CrossSystemTimelineEvent,
  FounderIntelligenceBriefing,
} from "@/lib/cross-system-intelligence/types";

export function buildFounderIntelligenceBriefing(input: {
  generated_at: string;
  risks: CrossSystemInsight[];
  opportunities: CrossSystemInsight[];
  correlations: CrossSystemCorrelation[];
  recommendations: CrossSystemRecommendation[];
  timeline: CrossSystemTimelineEvent[];
}): FounderIntelligenceBriefing {
  const topRisk = input.risks[0];
  const topOpportunity = input.opportunities[0];
  const topCorrelation = input.correlations[0];
  const topRecommendation = input.recommendations[0];

  const headline = topRisk
    ? `Platform Intelligence: ${topRisk.title}`
    : topOpportunity
      ? `Platform Intelligence: ${topOpportunity.title}`
      : "Platform Intelligence briefing is stable";

  const narrativeParts = [
    topCorrelation?.explanation,
    topRisk ? `Primary risk: ${topRisk.summary}` : null,
    topOpportunity ? `Primary opportunity: ${topOpportunity.summary}` : null,
    topRecommendation
      ? `Recommended action: ${topRecommendation.title}. Approval is still required before anything executes.`
      : "No urgent cross-system actions are recommended right now.",
  ].filter(Boolean);

  return {
    generated_at: input.generated_at,
    headline,
    narrative: narrativeParts.join(" "),
    top_risks: input.risks.slice(0, 5),
    top_opportunities: input.opportunities.slice(0, 5),
    top_correlations: input.correlations.slice(0, 5),
    recommended_actions: input.recommendations.slice(0, 5),
    recent_events: input.timeline.slice(0, 8),
    readOnly: true,
  };
}
