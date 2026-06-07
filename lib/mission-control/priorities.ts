import type { CopilotSummary } from "@/lib/copilot/types";
import type { OperationalIntelligenceSummary } from "@/lib/operational-intelligence/types";
import type {
  MissionAccelerator,
  MissionObjectiveView,
  MissionThreat,
  MissionThreatSeverity,
} from "@/lib/mission-control/types";
import type { PlanningSummary } from "@/lib/planning/types";
import type { ReportContext } from "@/lib/reports/context";

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;

function severityFromImpact(impact: number): MissionThreatSeverity {
  if (impact >= 90) return "critical";
  if (impact >= 75) return "high";
  if (impact >= 50) return "medium";
  return "low";
}

export function buildMissionObjectives(planning: PlanningSummary): MissionObjectiveView[] {
  const current = planning.priorities.slice(0, 3).map((priority) => ({
    id: priority.id,
    horizon: "current" as const,
    title: priority.title,
    summary: priority.summary,
    on_track: null,
    recommendation: priority.recommendation,
    related_routes: priority.related_routes,
  }));

  const weekly = planning.weekly_objectives.slice(0, 4).map((objective) => ({
    id: objective.id,
    horizon: "weekly" as const,
    title: objective.title,
    summary: objective.summary,
    on_track: objective.on_track,
    recommendation: objective.recommendation,
    related_routes: objective.related_routes,
  }));

  const monthly = planning.monthly_objectives.slice(0, 4).map((objective) => ({
    id: objective.id,
    horizon: "monthly" as const,
    title: objective.title,
    summary: objective.summary,
    on_track: objective.on_track,
    recommendation: objective.recommendation,
    related_routes: objective.related_routes,
  }));

  return [...current, ...weekly, ...monthly];
}

export function buildMissionThreats(input: {
  planning: PlanningSummary;
  report: ReportContext;
  operational: OperationalIntelligenceSummary;
  copilot: CopilotSummary;
}): MissionThreat[] {
  const threats: MissionThreat[] = [];

  for (const risk of input.planning.risks) {
    threats.push({
      id: risk.id,
      title: risk.title,
      summary: risk.summary,
      severity: severityFromImpact(risk.impact_score),
      recommendation: risk.recommendation,
      related_routes: risk.related_routes,
    });
  }

  for (const drag of input.operational.drag) {
    threats.push({
      id: drag.id,
      title: drag.label,
      summary: drag.summary,
      severity: severityFromImpact(drag.severity_score),
      recommendation: `Review linked operational signals and confirm mitigation path.`,
      related_routes: drag.related_routes,
    });
  }

  for (const signal of input.copilot.declining_signals) {
    threats.push({
      id: signal.id,
      title: signal.label,
      summary: signal.summary,
      severity: "medium",
      recommendation: "Inspect Copilot declining signals and linked Nexus routes.",
      related_routes: ["/admin/nexus/copilot"],
    });
  }

  if ((input.report.alerts.counts.critical ?? 0) > 0) {
    threats.push({
      id: "threat:critical-alerts",
      title: "Critical alerts active",
      summary: `${input.report.alerts.counts.critical} critical alert(s) threaten mission stability.`,
      severity: "critical",
      recommendation: "Resolve critical alerts before strategic initiatives.",
      related_routes: ["/admin/nexus/alerts"],
    });
  }

  return threats
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 10);
}

export function buildMissionAccelerators(input: {
  operational: OperationalIntelligenceSummary;
  planning: PlanningSummary;
  copilot: CopilotSummary;
}): MissionAccelerator[] {
  const accelerators: MissionAccelerator[] = [];

  for (const driver of input.operational.drivers) {
    accelerators.push({
      id: driver.id,
      label: driver.label,
      summary: driver.summary,
      influence_score: driver.influence_score,
      related_routes: driver.related_routes,
    });
  }

  for (const signal of input.copilot.improving_signals) {
    accelerators.push({
      id: signal.id,
      label: signal.label,
      summary: signal.summary,
      influence_score: 72,
      related_routes: ["/admin/nexus/copilot"],
    });
  }

  for (const opportunity of input.planning.opportunities.slice(0, 3)) {
    accelerators.push({
      id: opportunity.id,
      label: opportunity.title,
      summary: opportunity.summary,
      influence_score: Math.round(opportunity.impact_score * 0.7 + opportunity.confidence_score * 0.3),
      related_routes: opportunity.related_routes,
    });
  }

  const labelMap: Record<string, string> = {
    "driver:activity.meets_weekly": "Meet participation growth",
    "driver:activity.messages_weekly": "Messaging growth",
    "driver:blackcard.active_members": "Blackcard growth",
    "driver:growth.signups_weekly": "Community growth",
  };

  return accelerators
    .map((item) => ({
      ...item,
      label: labelMap[item.id] ?? item.label,
    }))
    .sort((a, b) => b.influence_score - a.influence_score)
    .slice(0, 8);
}
