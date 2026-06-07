import type { ReportContext } from "@/lib/reports/context";
import type { PlanningSummary } from "@/lib/planning/types";
import type { MissionHealthComponents } from "@/lib/mission-control/types";
import { METRIC_KEYS } from "@/lib/metrics/types";

type MetricTrend = {
  current: number;
  previous: number | null;
};

function trendDirection(trend: MetricTrend | null | undefined): "up" | "down" | "flat" | "unknown" {
  if (!trend || trend.previous == null) return "unknown";
  if (trend.current > trend.previous) return "up";
  if (trend.current < trend.previous) return "down";
  return "flat";
}

function trendScore(direction: "up" | "down" | "flat" | "unknown"): number {
  if (direction === "up") return 85;
  if (direction === "flat") return 60;
  if (direction === "down") return 35;
  return 50;
}

export function computeMissionHealthComponents(input: {
  report: ReportContext;
  trends: Record<string, MetricTrend>;
  planning: PlanningSummary;
}): MissionHealthComponents {
  const growthTrend = trendDirection(
    input.trends[METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY] ??
      input.trends[METRIC_KEYS.GROWTH_ACTIVE_PROFILES],
  );
  const engagementTrends = [
    trendDirection(input.trends[METRIC_KEYS.ACTIVITY_POSTS_WEEKLY]),
    trendDirection(input.trends[METRIC_KEYS.ACTIVITY_MEETS_WEEKLY]),
    trendDirection(input.trends[METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY]),
  ];
  const engagementUp = engagementTrends.filter((d) => d === "up").length;
  const engagementDown = engagementTrends.filter((d) => d === "down").length;
  const engagement =
    engagementUp >= 2 ? 85 : engagementDown >= 2 ? 35 : trendScore(engagementTrends[0] ?? "unknown");

  const revenue = trendScore(trendDirection(input.trends[METRIC_KEYS.REVENUE_MRR]));

  let operational_health = 75;
  if (input.report.health.systemStatus === "operational") operational_health += 10;
  if (input.report.health.systemStatus === "critical") operational_health = 25;
  else if (input.report.health.systemStatus !== "operational") operational_health = 45;

  let workflow_health = input.report.mission.score ?? 70;
  const degraded = (input.report.mission.workflows ?? []).filter((workflow) =>
    ["degraded", "impaired", "critical", "failing"].includes(
      workflow.workflow_status.toLowerCase(),
    ),
  ).length;
  workflow_health = Math.max(20, workflow_health - degraded * 12);

  const incident_penalty = Math.min(40, input.report.incidents.open.length * 15);
  const alert_penalty = Math.min(
    35,
    (input.report.alerts.counts.critical ?? 0) * 18 +
      (input.report.alerts.counts.active ?? 0) * 4,
  );

  const opportunity_boost = Math.min(
    15,
    input.planning.opportunities.length * 3 + input.planning.goal_status.filter((g) => g.status === "on_track").length * 2,
  );

  return {
    growth: trendScore(growthTrend),
    engagement,
    revenue,
    operational_health: Math.min(100, operational_health),
    workflow_health: Math.min(100, Math.max(0, workflow_health)),
    incident_penalty,
    alert_penalty,
    opportunity_boost,
  };
}

export function operationalHealthLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Healthy";
  if (score >= 50) return "Mixed";
  return "Strained";
}
