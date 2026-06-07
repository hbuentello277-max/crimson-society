import type { StrategicScenario } from "@/lib/scenarios/types";
import type { ScenarioBuildContext } from "@/lib/scenarios/types";
import {
  averageConfidence,
  benefitFromImpact,
  computeScenarioScore,
  focusBoost,
  formatScore,
  riskFromForecasts,
} from "@/lib/scenarios/scoring";

function findForecast(context: ScenarioBuildContext, category: string) {
  return context.forecasting.forecasts.find((forecast) => forecast.category === category);
}

export function buildOperationsScenario(context: ScenarioBuildContext): StrategicScenario {
  const operational = findForecast(context, "operational");
  const riskForecast = findForecast(context, "risk");

  const missionScore = context.report.mission.score;
  const openIncidents = context.report.incidents.open.length;
  const criticalAlerts = context.report.alerts.counts.critical ?? 0;
  const degradedWorkflows = (context.report.mission.workflows ?? []).filter((workflow) =>
    ["degraded", "failing"].includes(workflow.workflow_status),
  ).length;

  const hasMetrics =
    missionScore != null || openIncidents > 0 || criticalAlerts > 0 || degradedWorkflows > 0;
  const hasForecast = Boolean(operational?.available || riskForecast?.available);
  const available = hasForecast || hasMetrics || context.report.health.systemStatus != null;

  const baselineHealth = missionScore ?? 65;
  const riskReductionPotential = clampScore(
    Math.min(90, 30 + degradedWorkflows * 12 + openIncidents * 10 + criticalAlerts * 15),
  );

  const expectedBenefit = focusBoost(
    benefitFromImpact(
      clampScore(baselineHealth * 0.6 + riskReductionPotential * 0.4),
      averageConfidence([operational, riskForecast]),
    ),
    true,
  );

  const expectedRisk = focusBoost(
    Math.max(15, riskFromForecasts([operational, riskForecast], context.operationalStress) - 12),
    false,
    true,
  );

  const confidence = averageConfidence([operational, riskForecast]);
  const strategicImpact = focusBoost(
    context.mission.mission_status === "critical" || context.mission.mission_status === "at_risk"
      ? 82
      : 62,
    true,
  );

  const operationsDecision = context.decisions.top_recommended.find(
    (decision) => decision.category === "operations" || decision.category === "risk",
  );

  const scenarioScore = computeScenarioScore({
    expected_benefit: expectedBenefit,
    expected_risk: expectedRisk,
    confidence_score: confidence,
    strategic_impact: strategicImpact,
  });

  return {
    id: "scenario:operations",
    scenario_type: "operations",
    title: "Operations Focus",
    summary: available
      ? "Founder prioritizes workflow health, incident resolution, and platform reliability."
      : "Insufficient operational forecast and health metrics to model this scenario.",
    projected_benefits: available
      ? [
          {
            label: "Operational Health",
            value: operational?.available
              ? operational.projected_90d
              : formatScore(baselineHealth),
          },
          {
            label: "Risk Reduction",
            value: `${riskReductionPotential}/100 potential reduction from current baseline`,
          },
          {
            label: "Incident Stabilization",
            value:
              openIncidents > 0
                ? `${openIncidents} open incident(s) targeted for closure`
                : "No open incidents — maintain preventive posture",
          },
        ]
      : [{ label: "Status", value: "Unavailable" }],
    projected_risks: available
      ? [
          {
            label: "Growth Slowdown",
            value: "Operational focus may defer acquisition initiatives",
          },
          {
            label: "Revenue Delay",
            value: "Monetization experiments may pause during stabilization",
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
      ? operationsDecision?.recommendation ??
        "Review workflow diagnostics and resolve incidents before scaling growth initiatives."
      : "Collect operational forecast and mission health data before comparing reliability paths.",
    related_routes: [
      "/admin/nexus/mission-health",
      "/admin/nexus/incidents",
      "/admin/nexus/alerts",
    ],
    available,
    generated_at: context.generatedAt,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
