import type { MissionHealthComponents, MissionStatus } from "@/lib/mission-control/types";
import type { ReportContext } from "@/lib/reports/context";
export { clampScore } from "@/lib/nexus/scoring";
import { clampScore } from "@/lib/nexus/scoring";

const WEIGHTS = {
  growth: 0.15,
  engagement: 0.15,
  revenue: 0.15,
  operational_health: 0.15,
  workflow_health: 0.15,
  incidents: 0.1,
  alerts: 0.1,
  opportunities: 0.05,
} as const;

export function computeMissionScore(components: MissionHealthComponents): number {
  const positive =
    components.growth * WEIGHTS.growth +
    components.engagement * WEIGHTS.engagement +
    components.revenue * WEIGHTS.revenue +
    components.operational_health * WEIGHTS.operational_health +
    components.workflow_health * WEIGHTS.workflow_health +
    components.opportunity_boost * (WEIGHTS.opportunities * 6.67);

  const penalties =
    components.incident_penalty * WEIGHTS.incidents * 2.5 +
    components.alert_penalty * WEIGHTS.alerts * 2.5;

  return clampScore(positive - penalties);
}

export function deriveMissionStatus(input: {
  mission_score: number;
  report: ReportContext;
  components: MissionHealthComponents;
}): MissionStatus {
  const criticalAlerts = input.report.alerts.counts.critical ?? 0;
  const openIncidents = input.report.incidents.open.length;

  if (
    criticalAlerts > 0 ||
    openIncidents > 0 && input.report.incidents.open.some((i) => i.severity === "critical") ||
    input.mission_score < 40 ||
    input.report.health.systemStatus === "critical"
  ) {
    return "critical";
  }

  if (
    input.mission_score < 55 ||
    openIncidents > 0 ||
    input.components.workflow_health < 50 ||
    input.components.incident_penalty >= 15
  ) {
    return "at_risk";
  }

  if (input.mission_score >= 85 && input.components.growth >= 80 && input.components.engagement >= 75) {
    return "dominating";
  }

  if (input.mission_score >= 70) {
    return "growing";
  }

  return "stable";
}

export function missionStatusLabel(status: MissionStatus): string {
  const labels: Record<MissionStatus, string> = {
    dominating: "Dominating",
    growing: "Growing",
    stable: "Stable",
    at_risk: "At Risk",
    critical: "Critical",
  };
  return labels[status];
}

export function buildScoreBreakdown(components: MissionHealthComponents): Record<string, number> {
  return {
    growth: Math.round(components.growth * WEIGHTS.growth),
    engagement: Math.round(components.engagement * WEIGHTS.engagement),
    revenue: Math.round(components.revenue * WEIGHTS.revenue),
    operational_health: Math.round(components.operational_health * WEIGHTS.operational_health),
    workflow_health: Math.round(components.workflow_health * WEIGHTS.workflow_health),
    incidents: -Math.round(components.incident_penalty * WEIGHTS.incidents * 2.5),
    alerts: -Math.round(components.alert_penalty * WEIGHTS.alerts * 2.5),
    opportunities: Math.round(components.opportunity_boost * (WEIGHTS.opportunities * 6.67)),
  };
}

export function buildMissionSummary(input: {
  mission_status: MissionStatus;
  mission_score: number;
  primary_focus: string;
  top_threat: string;
}): string {
  const status = missionStatusLabel(input.mission_status);

  if (input.mission_status === "critical") {
    return `Mission is ${status} at score ${input.mission_score}. Immediate attention required: ${input.primary_focus}. Primary threat: ${input.top_threat}.`;
  }

  if (input.mission_status === "at_risk") {
    return `Mission is ${status} at score ${input.mission_score}. Stabilize ${input.primary_focus} before expanding initiatives. Watch ${input.top_threat}.`;
  }

  if (input.mission_status === "dominating") {
    return `Mission is ${status} at score ${input.mission_score}. Growth and engagement signals are strong. Maintain focus on ${input.primary_focus}.`;
  }

  if (input.mission_status === "growing") {
    return `Mission is ${status} at score ${input.mission_score}. Momentum is positive with focus on ${input.primary_focus}.`;
  }

  return `Mission is ${status} at score ${input.mission_score}. Current focus: ${input.primary_focus}.`;
}

export { WEIGHTS };
