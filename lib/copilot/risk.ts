import type { CorrelationsSummary } from "@/lib/correlations/types";
import type { ForecastingResult } from "@/lib/forecasting/types";
import type { PlanningSummary } from "@/lib/planning/types";
import type { ReportContext } from "@/lib/reports/context";
import type { CopilotRisk, CopilotRiskCandidate, CopilotSeverity } from "@/lib/copilot/types";
import { countDegradedWorkflows } from "@/lib/mission-health/degraded";

function severityFromScore(score: number): CopilotSeverity {
  if (score >= 90) return "critical";
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function buildTopRisk(input: {
  planning: PlanningSummary;
  report: ReportContext;
  forecasting: ForecastingResult;
  correlations: CorrelationsSummary;
}): CopilotRisk | null {
  const candidates: CopilotRiskCandidate[] = [];

  for (const risk of input.planning.risks) {
    candidates.push({
      id: risk.id,
      title: risk.title,
      summary: risk.summary,
      recommendation: risk.recommendation,
      severity: severityFromScore(risk.impact_score),
      related_route: risk.related_routes[0] ?? "/admin/nexus/planning",
      score: risk.impact_score * 0.6 + risk.confidence_score * 0.4,
    });
  }

  for (const incident of input.report.incidents.open) {
    candidates.push({
      id: `incident:${incident.id}`,
      title: incident.title,
      summary: incident.impact_summary || `Open incident with ${incident.severity} severity.`,
      recommendation: "Review incident context and assign the next mitigation step.",
      severity: incident.severity === "critical" ? "critical" : "high",
      related_route: "/admin/nexus/incidents",
      score: 70 + incident.impact_score / 2,
    });
  }

  if ((input.report.alerts.counts.critical ?? 0) > 0) {
    candidates.push({
      id: "alerts:critical",
      title: "Critical alerts active",
      summary: `${input.report.alerts.counts.critical} critical alert(s) are open.`,
      recommendation: "Open Alerts and resolve critical items before other strategic work.",
      severity: "critical",
      related_route: "/admin/nexus/alerts",
      score: 98,
    });
  }

  const riskForecast = input.forecasting.forecasts.find((forecast) => forecast.category === "risk");
  if (riskForecast?.available && riskForecast.risk_score >= 50) {
    candidates.push({
      id: "forecast:risk",
      title: "Risk trajectory worsening",
      summary: riskForecast.recommendation,
      recommendation: riskForecast.recommendation,
      severity: severityFromScore(riskForecast.risk_score),
      related_route: "/admin/nexus/forecasting",
      score: riskForecast.risk_score,
    });
  }

  for (const correlation of input.correlations.correlations.filter((item) =>
    ["risk", "platform_health", "operations"].includes(item.category),
  )) {
    candidates.push({
      id: `correlation:${correlation.id}`,
      title: correlation.title,
      summary: correlation.summary,
      recommendation: correlation.recommendation,
      severity: severityFromScore(correlation.impact_score),
      related_route: correlation.related_routes[0] ?? "/admin/nexus/correlations",
      score: correlation.impact_score * 0.55 + correlation.confidence_score * 0.45,
    });
  }

  const top = candidates.sort((a, b) => b.score - a.score)[0];
  if (!top) return null;

  return {
    title: top.title,
    summary: top.summary,
    recommendation: top.recommendation,
    severity: top.severity,
    related_route: top.related_route,
  };
}

export function buildDecliningSignals(input: {
  planning: PlanningSummary;
  forecasting: ForecastingResult;
  report: ReportContext;
}): import("@/lib/copilot/types").CopilotSignal[] {
  const signals: import("@/lib/copilot/types").CopilotSignal[] = [];

  for (const goal of input.planning.goal_status.filter((item) => item.status === "off_track")) {
    signals.push({
      id: `goal:${goal.id}`,
      label: goal.title,
      summary: goal.summary,
      source: "Planning",
    });
  }

  for (const risk of input.planning.risks.slice(0, 3)) {
    if (signals.length >= 6) break;
    signals.push({
      id: `risk:${risk.id}`,
      label: risk.title,
      summary: risk.summary,
      source: "Planning",
    });
  }

  for (const forecast of input.forecasting.forecasts.filter(
    (item) => item.available && item.risk_score >= 60,
  )) {
    if (signals.some((signal) => signal.id === `forecast:${forecast.category}`)) continue;
    signals.push({
      id: `forecast:${forecast.category}`,
      label: `${forecast.title} under pressure`,
      summary: forecast.recommendation,
      source: "Forecasting",
    });
  }

  const degraded = countDegradedWorkflows(input.report.mission.workflows);

  if (degraded > 0) {
    signals.push({
      id: "mission:degraded",
      label: "Workflow degradation",
      summary: `${degraded} workflow(s) are degraded and may affect member experience.`,
      source: "Founder Dashboard",
    });
  }

  return signals.slice(0, 6);
}
