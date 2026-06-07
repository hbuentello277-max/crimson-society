import { METRIC_KEYS } from "@/lib/metrics/types";
import { metricTrendDirection } from "@/lib/metrics/trends";
import { countDegradedWorkflows } from "@/lib/mission-health/degraded";
export { clampScore } from "@/lib/nexus/scoring";
import { clampScore } from "@/lib/nexus/scoring";
import type { MetricTrend, PlanningContext, PlanningGoalStatus } from "@/lib/planning/types";

function trend(context: PlanningContext, key: string): MetricTrend | null {
  return context.trends[key] ?? null;
}

function direction(metric: MetricTrend | null): "up" | "down" | "flat" | "unknown" {
  return metricTrendDirection(metric);
}

function degradedWorkflowCount(context: PlanningContext) {
  return countDegradedWorkflows(context.mission.workflows);
}

export function evaluatePlanningGoals(context: PlanningContext): PlanningGoalStatus[] {
  const goals: PlanningGoalStatus[] = [];

  const growthTrend = trend(context, METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY);
  const growthDir = direction(growthTrend);
  goals.push({
    id: "goal:growth",
    category: "growth",
    title: "Weekly member growth",
    status:
      growthDir === "up" ? "on_track" : growthDir === "down" ? "off_track" : "unknown",
    summary:
      growthDir === "up"
        ? "New member signups are trending upward this week."
        : growthDir === "down"
          ? "New member signups are trending downward this week."
          : "Insufficient growth trend data to assess weekly member growth.",
  });

  const mrrTrend = trend(context, METRIC_KEYS.REVENUE_MRR);
  const mrrDir = direction(mrrTrend);
  goals.push({
    id: "goal:revenue",
    category: "revenue",
    title: "Revenue trajectory",
    status: mrrDir === "up" ? "on_track" : mrrDir === "down" ? "off_track" : "unknown",
    summary:
      mrrDir === "up"
        ? "Estimated MRR is trending upward."
        : mrrDir === "down"
          ? "Estimated MRR is trending downward."
          : "Revenue trend data is unavailable or flat.",
  });

  const engagementKeys = [
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ];
  const engagementUp = engagementKeys.filter((key) => direction(trend(context, key)) === "up").length;
  const engagementDown = engagementKeys.filter((key) => direction(trend(context, key)) === "down").length;

  goals.push({
    id: "goal:engagement",
    category: "engagement",
    title: "Community engagement",
    status:
      engagementUp >= 2 ? "on_track" : engagementDown >= 2 ? "off_track" : "unknown",
    summary:
      engagementUp >= 2
        ? "Posts, meets, and messages show coordinated engagement momentum."
        : engagementDown >= 2
          ? "Engagement signals are declining across community activity."
          : "Engagement signals are mixed or unavailable.",
  });

  const blackcardTrend = trend(context, METRIC_KEYS.BLACKCARD_ACTIVE);
  goals.push({
    id: "goal:community",
    category: "community",
    title: "Blackcard community strength",
    status:
      direction(blackcardTrend) === "up"
        ? "on_track"
        : direction(blackcardTrend) === "down"
          ? "off_track"
          : "unknown",
    summary:
      direction(blackcardTrend) === "up"
        ? "Active Blackcard membership is rising."
        : direction(blackcardTrend) === "down"
          ? "Active Blackcard membership is falling."
          : "Blackcard membership trend is flat or unavailable.",
  });

  const degraded = degradedWorkflowCount(context);
  const openIncidents = context.incidents.open.length;
  const criticalAlerts = context.alerts.counts.critical ?? 0;
  goals.push({
    id: "goal:operations",
    category: "operations",
    title: "Operational stability",
    status:
      degraded === 0 && openIncidents === 0 && context.health.systemStatus === "operational"
        ? "on_track"
        : degraded > 0 || openIncidents > 0 || criticalAlerts > 0
          ? "off_track"
          : "unknown",
    summary:
      degraded > 0 || openIncidents > 0
        ? "Workflow degradation or incident load is affecting operational stability."
        : context.health.systemStatus === "operational"
          ? "Core platform operations remain stable."
          : "Platform health requires review.",
  });

  goals.push({
    id: "goal:risk",
    category: "risk",
    title: "Risk containment",
    status:
      criticalAlerts === 0 && openIncidents === 0
        ? "on_track"
        : criticalAlerts > 0 || openIncidents > 0
          ? "off_track"
          : "unknown",
    summary:
      criticalAlerts > 0 || openIncidents > 0
        ? "Active critical alerts or open incidents elevate platform risk."
        : "No major active risk signals detected in alerts or incidents.",
  });

  return goals;
}

export { degradedWorkflowCount, direction, trend };
