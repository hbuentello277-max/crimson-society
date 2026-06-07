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
  formatProjectionValue,
  riskFromForecasts,
} from "@/lib/scenarios/scoring";

function findForecast(context: ScenarioBuildContext, category: string) {
  return context.forecasting.forecasts.find((forecast) => forecast.category === category);
}

export function buildGrowthScenario(context: ScenarioBuildContext): StrategicScenario {
  const membership = findForecast(context, "membership");
  const engagement = findForecast(context, "engagement");
  const riskForecast = findForecast(context, "risk");

  const signupsWeek = context.report.metrics.growth.new_users_this_week;
  const hasMetrics = signupsWeek != null;
  const hasForecast = Boolean(membership?.available);
  const available = hasForecast || hasMetrics;

  const membership90 = forecastNumericAt90d(membership);
  const engagement90 = forecastNumericAt90d(engagement);
  const baselineGrowthImpact = membership?.available
    ? benefitFromRisk(membership.risk_score)
    : signupsWeek != null
      ? Math.min(85, 45 + Math.min(signupsWeek, 40))
      : 0;

  const expectedBenefit = focusBoost(
    benefitFromImpact(
      baselineGrowthImpact + (engagement?.available ? 8 : 0),
      averageConfidence([membership, engagement]),
    ),
    true,
  );

  const expectedRisk = focusBoost(
    riskFromForecasts([membership, riskForecast], context.operationalStress),
    false,
    true,
  );

  const confidence = averageConfidence([membership, engagement]);
  const strategicImpact = focusBoost(
    context.mission.mission_status === "growing" || context.mission.mission_status === "dominating"
      ? 78
      : 68,
    true,
  );

  const growthDecision = context.decisions.top_recommended.find(
    (decision) => decision.category === "growth",
  );

  const scenarioScore = computeScenarioScore({
    expected_benefit: expectedBenefit,
    expected_risk: expectedRisk,
    confidence_score: confidence,
    strategic_impact: strategicImpact,
  });

  return {
    id: "scenario:growth",
    scenario_type: "growth",
    title: "Growth Focus",
    summary: available
      ? "Founder prioritizes onboarding, member acquisition, and community expansion."
      : "Insufficient growth forecast and signup metrics to model this scenario.",
    projected_benefits: available
      ? [
          {
            label: "Projected Growth",
            value: membership?.available
              ? `${membership.projected_90d} (${formatPercentDelta(membership90, 1.12)})`
              : `${formatCount(signupsWeek)} signups/week baseline`,
          },
          {
            label: "Projected Engagement",
            value: engagement?.available
              ? `${engagement.projected_90d} with acquisition tailwind`
              : "Engagement forecast unavailable",
          },
          {
            label: "Community Expansion",
            value: formatProjectionValue(
              membership90 != null ? membership90 * 1.08 : null,
              formatCount,
            ),
          },
        ]
      : [{ label: "Status", value: "Unavailable" }],
    projected_risks: available
      ? [
          {
            label: "Operational Strain",
            value: context.operationalStress
              ? "Elevated — growth push may stress workflows"
              : "Moderate — workflows currently stable",
          },
          {
            label: "Revenue Lag",
            value: riskForecast?.available
              ? riskForecast.recommendation
              : "Conversion may lag acquisition without monetization focus",
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
      ? growthDecision?.recommendation ??
        "Focus on new member acquisition while monitoring engagement conversion."
      : "Collect more membership forecast and signup metrics before comparing growth paths.",
    related_routes: ["/admin/nexus/forecasting", "/admin/nexus/planning", "/admin/nexus/metrics"],
    available,
    generated_at: context.generatedAt,
  };
}
