import type { StrategicScenario } from "@/lib/scenarios/types";
import type { ScenarioBuildContext } from "@/lib/scenarios/types";
import {
  averageConfidence,
  benefitFromImpact,
  benefitFromRisk,
  computeScenarioScore,
  focusBoost,
  forecastNumericAt90d,
  formatCount,
  formatPercentDelta,
  riskFromForecasts,
} from "@/lib/scenarios/scoring";

function findForecast(context: ScenarioBuildContext, category: string) {
  return context.forecasting.forecasts.find((forecast) => forecast.category === category);
}

export function buildEngagementScenario(context: ScenarioBuildContext): StrategicScenario {
  const engagement = findForecast(context, "engagement");
  const membership = findForecast(context, "membership");

  const posts = context.report.metrics.activity.posts_this_week;
  const meets = context.report.metrics.activity.meets_this_week;
  const messages = context.report.metrics.activity.messages_this_week;
  const hasMetrics = posts != null || meets != null || messages != null;
  const hasForecast = Boolean(engagement?.available);
  const available = hasForecast || hasMetrics;

  const engagement90 = forecastNumericAt90d(engagement);
  const activityTotal =
    (posts ?? 0) + (meets ?? 0) + (messages ?? 0);

  const baselineImpact = engagement?.available
    ? benefitFromRisk(engagement.risk_score)
    : activityTotal > 0
      ? Math.min(82, 40 + Math.min(activityTotal / 5, 35))
      : 0;

  const expectedBenefit = focusBoost(
    benefitFromImpact(
      baselineImpact + (membership?.available ? 6 : 0),
      averageConfidence([engagement, membership]),
    ),
    true,
  );

  const expectedRisk = focusBoost(
    riskFromForecasts([engagement], context.operationalStress),
    false,
    true,
  );

  const confidence = averageConfidence([engagement]);
  const strategicImpact = focusBoost(
    context.correlations.counts_by_category.engagement > 0 ? 74 : 64,
    true,
  );

  const engagementDecision = context.decisions.top_recommended.find(
    (decision) => decision.category === "engagement" || decision.category === "community",
  );

  const scenarioScore = computeScenarioScore({
    expected_benefit: expectedBenefit,
    expected_risk: expectedRisk,
    confidence_score: confidence,
    strategic_impact: strategicImpact,
  });

  return {
    id: "scenario:engagement",
    scenario_type: "engagement",
    title: "Engagement Focus",
    summary: available
      ? "Founder prioritizes posts, meets, and messaging activity."
      : "Insufficient engagement forecast and activity metrics to model this scenario.",
    projected_benefits: available
      ? [
          {
            label: "Projected Activity",
            value: engagement?.available
              ? `${engagement.projected_90d} (${formatPercentDelta(engagement90, 1.14)})`
              : `${formatCount(activityTotal)} combined weekly activity baseline`,
          },
          {
            label: "Projected Retention",
            value: engagement?.available
              ? "Stronger retention expected from sustained activity loops"
              : "Retention projection unavailable",
          },
          {
            label: "Growth Spillover",
            value: membership?.available
              ? `${membership.projected_90d} indirect growth lift`
              : "Membership forecast unavailable",
          },
        ]
      : [{ label: "Status", value: "Unavailable" }],
    projected_risks: available
      ? [
          {
            label: "Moderation Load",
            value: activityTotal > 200 ? "Higher activity may increase moderation demand" : "Moderate",
          },
          {
            label: "Resource Strain",
            value: context.operationalStress
              ? "Operational stress may limit engagement programs"
              : "Low under current stability",
          },
          {
            label: "Projected Risk",
            value: `${expectedRisk}/100 scenario risk score`,
          },
        ]
      : [{ label: "Status", value: "Unavailable" }],
    confidence_score: confidence,
    impact_score: strategicImpact,
    expected_benefit: expectedBenefit,
    expected_risk: expectedRisk,
    strategic_impact: strategicImpact,
    scenario_score: scenarioScore,
    recommendation: available
      ? engagementDecision?.recommendation ??
        "Invest in meets and messaging loops while tracking signup conversion."
      : "Collect engagement forecast and activity metrics before comparing engagement paths.",
    related_routes: ["/admin/nexus/forecasting", "/admin/nexus/metrics", "/admin/nexus/correlations"],
    available,
    generated_at: context.generatedAt,
  };
}
