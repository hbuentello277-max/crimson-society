import { METRIC_KEYS } from "@/lib/metrics/types";
import type {
  CorrelationContext,
  CorrelationItem,
  CorrelationRuleResult,
  CorrelationSignal,
  MetricTrend,
  SignalDirection,
} from "@/lib/correlations/types";
import {
  clampScore,
  confidenceFromCoMovement,
  confidenceFromComparison,
  confidenceFromEventLinkage,
  impactByCategory,
  impactFromSignalCount,
  stablePercentChange,
} from "@/lib/correlations/scoring";

function trend(context: CorrelationContext, key: string): MetricTrend | null {
  return context.trends[key] ?? null;
}

function metricDirection(metric: MetricTrend | null): SignalDirection {
  if (!metric || metric.previous == null) return "unknown";
  if (metric.current > metric.previous) return "up";
  if (metric.current < metric.previous) return "down";
  return "flat";
}

function formatMetricValue(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString();
}

function signal(
  label: string,
  value: string,
  direction: SignalDirection,
  source: string,
  occurred_at: string,
): CorrelationSignal {
  return { label, value, direction, source, occurred_at };
}

function metricSignal(
  context: CorrelationContext,
  label: string,
  key: string,
  current: number | null,
  source: string,
): CorrelationSignal {
  const metricTrend = trend(context, key);
  return signal(
    label,
    formatMetricValue(current),
    metricDirection(metricTrend),
    source,
    context.generated_at,
  );
}

function item(
  input: Omit<CorrelationItem, "generated_at" | "time_window">,
  context: CorrelationContext,
): CorrelationItem {
  return {
    ...input,
    confidence_score: clampScore(input.confidence_score),
    impact_score: clampScore(input.impact_score),
    time_window: context.window,
    generated_at: context.generated_at,
  };
}

function degradedWorkflows(context: CorrelationContext) {
  return (context.mission.workflows ?? []).filter((workflow) =>
    ["degraded", "impaired", "critical", "failing", "warn", "warning"].includes(
      workflow.workflow_status.toLowerCase(),
    ),
  );
}

function countDirections(keys: string[], context: CorrelationContext, target: SignalDirection) {
  return keys.filter((key) => metricDirection(trend(context, key)) === target).length;
}

export function ruleDeploymentCorrelation(context: CorrelationContext): CorrelationRuleResult {
  const latestDeployment = context.deployments[0];
  if (!latestDeployment) return null;

  const incidentsAfter = context.post_deployment_incidents;
  const alertsAfter = context.post_deployment_critical_alerts;
  const degradedCount = degradedWorkflows(context).length;

  if (incidentsAfter === 0 && alertsAfter === 0 && degradedCount === 0) return null;

  const signals: CorrelationSignal[] = [
    signal(
      "Latest deployment",
      latestDeployment.deployment_id,
      "flat",
      "deployments",
      latestDeployment.finished_at ?? latestDeployment.started_at,
    ),
  ];

  if (incidentsAfter > 0) {
    signals.push(
      signal(
        "Incidents within 24h",
        String(incidentsAfter),
        "up",
        "incidents",
        context.generated_at,
      ),
    );
  }

  if (alertsAfter > 0) {
    signals.push(
      signal(
        "Critical alerts within 24h",
        String(alertsAfter),
        "up",
        "alerts",
        context.generated_at,
      ),
    );
  }

  if (degradedCount > 0) {
    signals.push(
      signal(
        "Degraded workflows",
        String(degradedCount),
        "down",
        "mission-health",
        context.mission.checked_at ?? context.generated_at,
      ),
    );
  }

  const confidence = confidenceFromEventLinkage({
    eventCount: incidentsAfter + alertsAfter + (degradedCount > 0 ? 1 : 0),
    severity: incidentsAfter > 0 || alertsAfter > 0 ? "critical" : "warning",
  });

  return item(
    {
      id: "operations:deployment-aftermath",
      category: "operations",
      title: "Deployment followed by operational friction",
      summary: `Production deployment ${latestDeployment.deployment_id} was followed within 24 hours by ${incidentsAfter} incident signal(s), ${alertsAfter} critical alert signal(s), and ${degradedCount} degraded workflow(s).`,
      signals,
      confidence_score: confidence,
      impact_score: impactFromSignalCount("risk", signals.length),
      recommendation:
        "Review deployment changes, open incidents, and degraded workflows together before the next release.",
      related_routes: [
        "/admin/nexus/system-health",
        "/admin/nexus/incidents",
        "/admin/nexus/alerts",
        "/admin/nexus/mission-health",
      ],
    },
    context,
  );
}

export function ruleEngagementCorrelation(context: CorrelationContext): CorrelationRuleResult {
  const keys = [
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ];

  const upCount = countDirections(keys, context, "up");
  if (upCount < 3) return null;

  const confidence = confidenceFromCoMovement(upCount, 3);
  if (confidence == null) return null;

  const signals = [
    metricSignal(
      context,
      "Posts this week",
      METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
      context.metrics.activity.posts_this_week,
      "metrics",
    ),
    metricSignal(
      context,
      "Meets this week",
      METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
      context.metrics.activity.meets_this_week,
      "metrics",
    ),
    metricSignal(
      context,
      "Messages this week",
      METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
      context.metrics.activity.messages_this_week,
      "metrics",
    ),
  ];

  return item(
    {
      id: "engagement:community-momentum",
      category: "engagement",
      title: "Community engagement rising together",
      summary:
        "Posts, meets, and messages are all trending upward together, indicating synchronized community momentum.",
      signals,
      confidence_score: confidence,
      impact_score: impactByCategory("community", 8),
      recommendation:
        "Protect the current engagement loop with onboarding quality and featured community activity.",
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/observations"],
    },
    context,
  );
}

export function ruleGrowthEngagementCorrelation(context: CorrelationContext): CorrelationRuleResult {
  const growthTrend = trend(context, METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY);
  if (metricDirection(growthTrend) !== "up") return null;

  const engagementKeys = [
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ];
  const engagementUp = countDirections(engagementKeys, context, "up");
  if (engagementUp < 2) return null;

  const confidence = confidenceFromCoMovement(engagementUp + 1, 3);
  if (confidence == null) return null;

  const current = context.metrics.growth.new_users_this_week;
  const previous = growthTrend?.previous ?? null;
  const change =
    current != null && previous != null ? stablePercentChange(current, previous) : null;

  const signals: CorrelationSignal[] = [
    metricSignal(
      context,
      "New users this week",
      METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
      current,
      "metrics",
    ),
    ...engagementKeys.map((key, index) =>
      metricSignal(
        context,
        ["Posts this week", "Meets this week", "Messages this week"][index],
        key,
        [
          context.metrics.activity.posts_this_week,
          context.metrics.activity.meets_this_week,
          context.metrics.activity.messages_this_week,
        ][index],
        "metrics",
      ),
    ),
  ];

  return item(
    {
      id: "growth:new-users-with-engagement",
      category: "growth",
      title: "Growth arriving with stronger engagement",
      summary:
        change == null
          ? "New user growth is increasing while community engagement signals are also rising."
          : `New users increased ${change}% this week while engagement signals moved upward alongside acquisition.`,
      signals,
      confidence_score: confidence,
      impact_score: impactByCategory("growth", 10),
      recommendation:
        "Double down on the acquisition channels and onboarding moments that coincide with active community behavior.",
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/intelligence"],
    },
    context,
  );
}

export function ruleRevenueBlackcardCorrelation(context: CorrelationContext): CorrelationRuleResult {
  const revenueUp =
    metricDirection(trend(context, METRIC_KEYS.REVENUE_MRR)) === "up" ||
    metricDirection(trend(context, METRIC_KEYS.BLACKCARD_ACTIVE)) === "up";

  if (!revenueUp) return null;

  const engagementKeys = [
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ];
  const engagementUp = countDirections(engagementKeys, context, "up");
  if (engagementUp < 2) return null;

  const confidence = confidenceFromCoMovement(engagementUp + 1, 3);
  if (confidence == null) return null;

  const signals = [
    metricSignal(
      context,
      "Estimated MRR",
      METRIC_KEYS.REVENUE_MRR,
      context.metrics.revenue.estimated_mrr,
      "metrics",
    ),
    metricSignal(
      context,
      "Blackcard members",
      METRIC_KEYS.BLACKCARD_ACTIVE,
      context.metrics.blackcard.active_members,
      "metrics",
    ),
    ...engagementKeys.slice(0, 2).map((key, index) =>
      metricSignal(
        context,
        index === 0 ? "Posts this week" : "Meets this week",
        key,
        index === 0
          ? context.metrics.activity.posts_this_week
          : context.metrics.activity.meets_this_week,
        "metrics",
      ),
    ),
  ];

  return item(
    {
      id: "blackcard:revenue-with-engagement",
      category: "blackcard",
      title: "Revenue signals moving with engagement",
      summary:
        "Blackcard or MRR growth is occurring alongside rising community engagement, suggesting monetization is aligned with active usage.",
      signals,
      confidence_score: confidence,
      impact_score: impactByCategory("revenue", 8),
      recommendation:
        "Review Blackcard conversion paths while engagement is strong and protect the member experience driving revenue.",
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/reports"],
    },
    context,
  );
}

export function ruleWorkflowDegradationRisk(context: CorrelationContext): CorrelationRuleResult {
  const degraded = degradedWorkflows(context);
  if (degraded.length === 0) return null;

  const openAlerts = context.alerts.counts.active ?? 0;
  const openIncidents = context.incidents.open.length;
  if (openAlerts === 0 && openIncidents === 0) return null;

  const signals: CorrelationSignal[] = degraded.slice(0, 3).map((workflow) =>
    signal(
      workflow.display_name,
      workflow.workflow_status,
      "down",
      "mission-health",
      context.mission.checked_at ?? context.generated_at,
    ),
  );

  signals.push(
    signal("Open alerts", String(openAlerts), openAlerts > 0 ? "up" : "flat", "alerts", context.generated_at),
    signal(
      "Open incidents",
      String(openIncidents),
      openIncidents > 0 ? "up" : "flat",
      "incidents",
      context.generated_at,
    ),
  );

  return item(
    {
      id: "risk:workflow-degradation-with-ops-load",
      category: "risk",
      title: "Workflow degradation coinciding with operational load",
      summary: `${degraded.length} workflow(s) are degraded while alerts and incidents remain active, suggesting user-facing friction and operational stress are linked.`,
      signals,
      confidence_score: confidenceFromEventLinkage({
        eventCount: degraded.length + (openAlerts > 0 ? 1 : 0) + (openIncidents > 0 ? 1 : 0),
        severity: openIncidents > 0 ? "critical" : "warning",
      }),
      impact_score: impactByCategory("platform_health", 10),
      recommendation:
        "Prioritize degraded workflows tied to active alerts or incidents before broader platform changes.",
      related_routes: [
        "/admin/nexus/mission-health",
        "/admin/nexus/alerts",
        "/admin/nexus/incidents",
      ],
    },
    context,
  );
}

export function ruleMemoryMilestoneCorrelation(context: CorrelationContext): CorrelationRuleResult {
  const milestone = context.memory_entries.find((entry) =>
    ["milestone", "growth", "revenue"].includes(entry.entry_type),
  );
  if (!milestone) return null;

  const growthUp = metricDirection(trend(context, METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY)) === "up";
  const revenueUp = metricDirection(trend(context, METRIC_KEYS.REVENUE_MRR)) === "up";
  const engagementUp =
    countDirections(
      [
        METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
        METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
        METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
      ],
      context,
      "up",
    ) >= 2;

  if (!growthUp && !revenueUp && !engagementUp) return null;

  const signals: CorrelationSignal[] = [
    signal(milestone.title, milestone.entry_type, "up", "memory", milestone.occurred_at),
  ];

  if (growthUp) {
    signals.push(
      metricSignal(
        context,
        "New users this week",
        METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
        context.metrics.growth.new_users_this_week,
        "metrics",
      ),
    );
  }

  if (revenueUp) {
    signals.push(
      metricSignal(
        context,
        "Estimated MRR",
        METRIC_KEYS.REVENUE_MRR,
        context.metrics.revenue.estimated_mrr,
        "metrics",
      ),
    );
  }

  if (engagementUp) {
    signals.push(
      metricSignal(
        context,
        "Posts this week",
        METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
        context.metrics.activity.posts_this_week,
        "metrics",
      ),
    );
  }

  const confidence =
    confidenceFromComparison({
      current: signals.length,
      previous: 1,
      signalCount: signals.length,
    }) ?? 75;

  return item(
    {
      id: `milestone:memory-${milestone.id}`,
      category: milestone.entry_type === "revenue" ? "revenue" : "growth",
      title: "Memory milestone followed by platform movement",
      summary: `Recorded memory "${milestone.title}" aligns with subsequent ${growthUp ? "growth" : ""}${growthUp && revenueUp ? ", " : ""}${revenueUp ? "revenue" : ""}${engagementUp ? " and engagement" : ""} movement in the current window.`,
      signals,
      confidence_score: confidence,
      impact_score: impactByCategory("growth", milestone.importance_score),
      recommendation:
        "Use this milestone as context when interpreting current growth, revenue, and engagement performance.",
      related_routes: ["/admin/nexus/memory", "/admin/nexus/metrics", "/admin/nexus/reports"],
    },
    context,
  );
}

export function ruleCommandCorrelation(context: CorrelationContext): CorrelationRuleResult {
  if (context.recent_commands.length === 0) return null;

  const degradedCount = degradedWorkflows(context).length;
  const openIncidents = context.incidents.open.length;
  const criticalAlerts = context.alerts.counts.critical ?? 0;
  const systemOperational = context.health.systemStatus === "operational";

  if (!systemOperational || degradedCount > 0 || openIncidents > 0 || criticalAlerts > 0) {
    return null;
  }

  const signals: CorrelationSignal[] = context.recent_commands.slice(0, 3).map((command) =>
    signal(command.title, command.status, "up", "commands", command.updated_at),
  );

  signals.push(
    signal(
      "System status",
      context.health.systemStatus ?? "unknown",
      "flat",
      "health",
      context.health.checkedAt ?? context.generated_at,
    ),
  );

  return item(
    {
      id: "operations:command-with-stable-ops",
      category: "operations",
      title: "Command activity aligned with stable operations",
      summary:
        "Recent command approvals or completions occurred while platform health remained operational and major incident load stayed clear.",
      signals,
      confidence_score: confidenceFromCoMovement(signals.length, 2) ?? 70,
      impact_score: impactByCategory("operations", 4),
      recommendation:
        "Review completed command recommendations as part of the current stable operating posture.",
      related_routes: ["/admin/nexus/commands", "/admin/nexus/system-health"],
    },
    context,
  );
}

export function ruleLowActivityRisk(context: CorrelationContext): CorrelationRuleResult {
  const keys = [
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ];

  const values = [
    context.metrics.activity.posts_this_week,
    context.metrics.activity.meets_this_week,
    context.metrics.activity.messages_this_week,
  ];

  if (values.some((value) => value == null)) return null;

  const lowThreshold = 5;
  const directions = keys.map((key) => metricDirection(trend(context, key)));
  const allLowOrFlat = directions.every(
    (direction, index) =>
      direction === "flat" ||
      direction === "down" ||
      direction === "unknown" ||
      (values[index] ?? 0) <= lowThreshold,
  );

  if (!allLowOrFlat) return null;

  const signals = keys.map((key, index) =>
    metricSignal(
      context,
      ["Posts this week", "Meets this week", "Messages this week"][index],
      key,
      values[index],
      "metrics",
    ),
  );

  return item(
    {
      id: "engagement:low-activity-risk",
      category: "community",
      title: "Engagement activity is flat or low",
      summary:
        "Posts, meets, and messages are not rising together and remain low or flat, creating a community engagement risk signal.",
      signals,
      confidence_score: 78,
      impact_score: impactByCategory("engagement", 6),
      recommendation:
        "Inspect community activation loops, featured content, and meet cadence before acquisition spend increases.",
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/observations", "/admin/nexus/intelligence"],
    },
    context,
  );
}

export const CORRELATION_RULES: Array<(context: CorrelationContext) => CorrelationRuleResult> = [
  ruleDeploymentCorrelation,
  ruleEngagementCorrelation,
  ruleGrowthEngagementCorrelation,
  ruleRevenueBlackcardCorrelation,
  ruleWorkflowDegradationRisk,
  ruleMemoryMilestoneCorrelation,
  ruleCommandCorrelation,
  ruleLowActivityRisk,
];

export function generateCorrelationItems(context: CorrelationContext): CorrelationItem[] {
  const items: CorrelationItem[] = [];
  const seen = new Set<string>();

  for (const rule of CORRELATION_RULES) {
    const result = rule(context);
    if (!result || seen.has(result.id)) continue;
    seen.add(result.id);
    items.push(result);
  }

  return items;
}
