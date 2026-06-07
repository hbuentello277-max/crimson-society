import type { StrategicScenario } from "@/lib/scenarios/types";
import type { ScenarioBuildContext } from "@/lib/scenarios/types";
import {
  averageConfidence,
  benefitFromImpact,
  computeScenarioScore,
  focusBoost,
  forecastNumericAt90d,
  formatCount,
  formatCurrency,
  formatPercentDelta,
  riskFromForecasts,
} from "@/lib/scenarios/scoring";

function findForecast(context: ScenarioBuildContext, category: string) {
  return context.forecasting.forecasts.find((forecast) => forecast.category === category);
}

export function buildRevenueScenario(context: ScenarioBuildContext): StrategicScenario {
  const revenue = findForecast(context, "revenue");
  const blackcard = findForecast(context, "blackcard");
  const engagement = findForecast(context, "engagement");

  const mrr = context.report.metrics.revenue.estimated_mrr;
  const arr = context.report.metrics.revenue.estimated_arr;
  const hasMetrics = mrr != null || arr != null;
  const hasForecast = Boolean(revenue?.available || blackcard?.available);
  const available = hasForecast || hasMetrics;

  const revenue90 = forecastNumericAt90d(revenue);
  const blackcard90 = forecastNumericAt90d(blackcard);

  const baselineImpact =
    revenue?.available && blackcard?.available
      ? clampBenefitFromRisk((revenue.risk_score + blackcard.risk_score) / 2)
      : revenue?.available
        ? clampBenefitFromRisk(revenue.risk_score)
        : blackcard?.available
          ? clampBenefitFromRisk(blackcard.risk_score)
          : mrr != null
            ? Math.min(80, 40 + Math.log10(Math.max(mrr, 1)) * 8)
            : 0;

  const expectedBenefit = focusBoost(
    benefitFromImpact(baselineImpact, averageConfidence([revenue, blackcard])),
    true,
  );

  const expectedRisk = focusBoost(
    riskFromForecasts([revenue, blackcard], context.operationalStress) +
      (engagement?.available && engagement.risk_score >= 55 ? 6 : 0),
    false,
    true,
  );

  const confidence = averageConfidence([revenue, blackcard]);
  const strategicImpact = focusBoost(
    context.planning.opportunities.some((item) => item.category === "revenue") ? 76 : 66,
    true,
  );

  const revenueDecision = context.decisions.top_recommended.find(
    (decision) => decision.category === "revenue" || decision.category === "blackcard",
  );

  const scenarioScore = computeScenarioScore({
    expected_benefit: expectedBenefit,
    expected_risk: expectedRisk,
    confidence_score: confidence,
    strategic_impact: strategicImpact,
  });

  return {
    id: "scenario:revenue",
    scenario_type: "revenue",
    title: "Revenue Focus",
    summary: available
      ? "Founder prioritizes Blackcard, monetization, and membership conversion."
      : "Insufficient revenue and Blackcard forecast data to model this scenario.",
    projected_benefits: available
      ? [
          {
            label: "Projected MRR",
            value: revenue?.available
              ? `${revenue.projected_90d} (${formatPercentDelta(revenue90, 1.1)})`
              : mrr != null
                ? `${formatCurrency(mrr)} current baseline`
                : "Unavailable",
          },
          {
            label: "Projected ARR",
            value: arr != null
              ? `${formatCurrency(arr * 1.1)} with conversion focus`
              : revenue90 != null
                ? `${formatCurrency(revenue90 * 12)} estimated from MRR trend`
                : "Unavailable",
          },
          {
            label: "Blackcard Impact",
            value: blackcard?.available
              ? `${blackcard.projected_90d} (${formatCount(blackcard90)})`
              : "Blackcard forecast unavailable",
          },
          {
            label: "Engagement Impact",
            value: engagement?.available
              ? `${engagement.projected_90d} — monitor for monetization friction`
              : "Engagement forecast unavailable",
          },
        ]
      : [{ label: "Status", value: "Unavailable" }],
    projected_risks: available
      ? [
          {
            label: "Conversion Friction",
            value: "Aggressive monetization may slow community growth",
          },
          {
            label: "Engagement Dilution",
            value:
              engagement?.risk_score != null && engagement.risk_score >= 60
                ? "Engagement trend already stressed"
                : "Moderate if benefits remain visible",
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
      ? revenueDecision?.recommendation ?? "Highlight Blackcard benefits while tracking engagement retention."
      : "Collect revenue and Blackcard forecast data before comparing monetization paths.",
    related_routes: ["/admin/nexus/forecasting", "/admin/nexus/reports", "/admin/nexus/metrics"],
    available,
    generated_at: context.generatedAt,
  };
}

function clampBenefitFromRisk(riskScore: number): number {
  return Math.max(35, 100 - riskScore);
}
