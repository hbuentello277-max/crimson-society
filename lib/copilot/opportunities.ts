import type { CorrelationsSummary } from "@/lib/correlations/types";
import type { IntelligenceSummary } from "@/lib/intelligence/types";
import type { PlanningSummary } from "@/lib/planning/types";
import type { CopilotOpportunity, CopilotOpportunityCandidate } from "@/lib/copilot/types";

export function buildTopOpportunity(input: {
  planning: PlanningSummary;
  intelligence: IntelligenceSummary;
  correlations: CorrelationsSummary;
}): CopilotOpportunity | null {
  const candidates: CopilotOpportunityCandidate[] = [];

  for (const opportunity of input.planning.opportunities) {
    candidates.push({
      id: opportunity.id,
      title: opportunity.title,
      summary: opportunity.summary,
      recommendation: opportunity.recommendation,
      confidence_score: opportunity.confidence_score,
      impact_score: opportunity.impact_score,
      related_route: opportunity.related_routes[0] ?? "/admin/nexus/planning",
      score: opportunity.impact_score * 0.55 + opportunity.confidence_score * 0.45,
    });
  }

  for (const item of input.intelligence.items.filter((row) =>
    ["opportunity", "growth", "engagement"].includes(row.category),
  )) {
    candidates.push({
      id: `intelligence:${item.id}`,
      title: item.title,
      summary: item.summary,
      recommendation: item.recommendation,
      confidence_score: item.confidence_score,
      impact_score: item.impact_score,
      related_route: "/admin/nexus/intelligence",
      score: item.impact_score * 0.5 + item.confidence_score * 0.5,
    });
  }

  for (const correlation of input.correlations.correlations.filter((item) =>
    ["growth", "engagement", "community", "blackcard", "revenue"].includes(item.category),
  )) {
    candidates.push({
      id: `correlation:${correlation.id}`,
      title: correlation.title,
      summary: correlation.summary,
      recommendation: correlation.recommendation,
      confidence_score: correlation.confidence_score,
      impact_score: correlation.impact_score,
      related_route: correlation.related_routes[0] ?? "/admin/nexus/correlations",
      score: correlation.impact_score * 0.45 + correlation.confidence_score * 0.55,
    });
  }

  const top = candidates.sort((a, b) => b.score - a.score)[0];
  if (!top) return null;

  return {
    title: top.title,
    summary: top.summary,
    recommendation: top.recommendation,
    confidence_score: top.confidence_score,
    impact_score: top.impact_score,
    related_route: top.related_route,
  };
}

export function buildImprovingSignals(input: {
  planning: PlanningSummary;
  forecasting: import("@/lib/forecasting/types").ForecastingResult;
}): import("@/lib/copilot/types").CopilotSignal[] {
  const signals: import("@/lib/copilot/types").CopilotSignal[] = [];

  const labelMap: Record<string, string> = {
    "goal:growth": "Membership growth improving",
    "goal:revenue": "Revenue improving",
    "goal:engagement": "Engagement improving",
    "goal:community": "Community health improving",
    "goal:operations": "Workflow health improving",
  };

  for (const goal of input.planning.goal_status.filter((item) => item.status === "on_track")) {
    signals.push({
      id: goal.id,
      label: labelMap[goal.id] ?? goal.title,
      summary: goal.summary,
      source: "Planning",
    });
  }

  for (const opportunity of input.planning.opportunities.slice(0, 2)) {
    if (signals.length >= 6) break;
    signals.push({
      id: `opportunity:${opportunity.id}`,
      label: opportunity.title,
      summary: opportunity.summary,
      source: "Planning",
    });
  }

  for (const forecast of input.forecasting.forecasts.filter(
    (item) => item.available && item.confidence_score != null && item.risk_score < 50,
  )) {
    const improvingLabels: Record<string, string> = {
      membership: "Membership trajectory improving",
      blackcard: "Blackcard growth improving",
      revenue: "Revenue improving",
      engagement: "Engagement improving",
      operational: "Operational outlook stable",
    };

    signals.push({
      id: `forecast:${forecast.category}`,
      label: improvingLabels[forecast.category] ?? forecast.title,
      summary: forecast.recommendation,
      source: "Forecasting",
    });
  }

  return signals.slice(0, 6);
}
