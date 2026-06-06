import { METRIC_KEYS } from "@/lib/metrics/types";
import type { IntelligenceContext, IntelligenceItem, IntelligenceRuleResult } from "@/lib/intelligence/types";
import {
  clampScore,
  confidenceFromComparison,
  confidenceFromSignalStrength,
  impactByCategory,
  impactFromCount,
  impactFromDelta,
  impactFromSeverity,
  stablePercentChange,
} from "@/lib/intelligence/scoring";

function item(
  input: Omit<IntelligenceItem, "generated_at"> & { generated_at?: string },
  context: IntelligenceContext,
): IntelligenceItem {
  return {
    ...input,
    confidence_score: clampScore(input.confidence_score),
    impact_score: clampScore(input.impact_score),
    generated_at: input.generated_at ?? context.generated_at,
  };
}

function trend(context: IntelligenceContext, key: string) {
  return context.trends[key] ?? null;
}

function degradedWorkflows(context: IntelligenceContext) {
  return (context.mission.workflows ?? []).filter((workflow) =>
    ["degraded", "impaired", "critical", "failing", "warn", "warning"].includes(
      workflow.workflow_status.toLowerCase(),
    ),
  );
}

export function ruleUserGrowthSlowing(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.growth.new_users_this_month;
  const metricTrend = trend(context, METRIC_KEYS.GROWTH_SIGNUPS_MONTHLY);
  const previous = metricTrend?.previous ?? null;

  if (current == null || previous == null) return null;
  if (current >= previous) return null;

  const change = stablePercentChange(current, previous);
  const summary =
    change == null
      ? `New users this month (${current}) decreased compared to the previous tracked period (${previous}).`
      : `New users this month (${current}) decreased by ${Math.abs(change)}% compared to the previous tracked period (${previous}).`;

  const confidence = confidenceFromComparison({ current, previous });
  if (confidence == null) return null;

  return item(
    {
      id: "growth:user-growth-slowing",
      category: "growth",
      title: "User growth slowing",
      summary,
      recommendation: "Increase community acquisition efforts.",
      confidence_score: confidence,
      impact_score: impactFromDelta({ category: "growth", current, previous }),
    },
    context,
  );
}

export function ruleUserGrowthAccelerating(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.growth.new_users_this_month;
  const metricTrend = trend(context, METRIC_KEYS.GROWTH_SIGNUPS_MONTHLY);
  const previous = metricTrend?.previous ?? null;

  if (current == null || previous == null) return null;
  if (current <= previous) return null;

  const change = stablePercentChange(current, previous);

  return item(
    {
      id: "growth:user-growth-accelerating",
      category: "growth",
      title: "User growth accelerating",
      summary:
        change == null
          ? `New users this month (${current}) increased compared to the previous tracked period (${previous}).`
          : `New users this month (${current}) increased by ${change}% compared to the previous tracked period (${previous}).`,
      recommendation: "Maintain onboarding quality while scaling acquisition.",
      confidence_score: confidenceFromComparison({ current, previous }) ?? 80,
      impact_score: impactFromDelta({ category: "growth", current, previous }),
    },
    context,
  );
}

export function ruleWeeklySignupsSlowing(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.growth.new_users_this_week;
  const metricTrend = trend(context, METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY);
  const previous = metricTrend?.previous ?? null;

  if (current == null || previous == null) return null;
  if (current >= previous) return null;

  return item(
    {
      id: "growth:weekly-signups-slowing",
      category: "growth",
      title: "Weekly signups slowing",
      summary: `New users this week (${current}) are below the previous tracked period (${previous}).`,
      recommendation: "Review recent acquisition channels and rider referral activity.",
      confidence_score: 85,
      impact_score: impactFromDelta({ category: "growth", current, previous }),
    },
    context,
  );
}

export function ruleBlackcardStagnant(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.blackcard.active_members;
  const metricTrend = trend(context, METRIC_KEYS.BLACKCARD_ACTIVE);
  const previous = metricTrend?.previous ?? null;

  if (current == null || previous == null) return null;
  if (current > previous) return null;

  return item(
    {
      id: "revenue:blackcard-stagnant",
      category: "revenue",
      title: "Blackcard conversions stagnant",
      summary:
        current === previous
          ? `Blackcard membership (${current}) has not increased since the previous tracked period.`
          : `Blackcard membership decreased from ${previous} to ${current}.`,
      recommendation: "Promote Blackcard benefits.",
      confidence_score: 90,
      impact_score: impactByCategory("revenue", current === previous ? 0 : 10),
    },
    context,
  );
}

export function ruleBlackcardGrowing(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.blackcard.active_members;
  const metricTrend = trend(context, METRIC_KEYS.BLACKCARD_ACTIVE);
  const previous = metricTrend?.previous ?? null;

  if (current == null || previous == null) return null;
  if (current <= previous) return null;

  return item(
    {
      id: "revenue:blackcard-growing",
      category: "revenue",
      title: "Blackcard membership growing",
      summary: `Blackcard members increased from ${previous} to ${current}.`,
      recommendation: "Reinforce retention messaging for new Blackcard members.",
      confidence_score: 88,
      impact_score: impactFromDelta({ category: "revenue", current, previous }),
    },
    context,
  );
}

export function ruleMrrDeclining(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.revenue.estimated_mrr;
  const metricTrend = trend(context, METRIC_KEYS.REVENUE_MRR);
  const previous = metricTrend?.previous ?? null;

  if (current == null || previous == null) return null;
  if (current >= previous) return null;

  return item(
    {
      id: "revenue:mrr-declining",
      category: "revenue",
      title: "Estimated MRR declining",
      summary: `Estimated MRR decreased from $${previous.toLocaleString()} to $${current.toLocaleString()}.`,
      recommendation: "Review subscription changes and billing workflow health.",
      confidence_score: 85,
      impact_score: impactFromDelta({ category: "revenue", current, previous }),
    },
    context,
  );
}

export function ruleMrrGrowing(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.revenue.estimated_mrr;
  const metricTrend = trend(context, METRIC_KEYS.REVENUE_MRR);
  const previous = metricTrend?.previous ?? null;

  if (current == null || previous == null) return null;
  if (current <= previous) return null;

  return item(
    {
      id: "revenue:mrr-growing",
      category: "revenue",
      title: "Estimated MRR growing",
      summary: `Estimated MRR increased from $${previous.toLocaleString()} to $${current.toLocaleString()}.`,
      recommendation: "Monitor churn signals while sustaining current conversion paths.",
      confidence_score: 85,
      impact_score: impactFromDelta({ category: "revenue", current, previous }),
    },
    context,
  );
}

export function ruleMeetCreationRising(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.activity.meets_this_week;
  const metricTrend = trend(context, METRIC_KEYS.ACTIVITY_MEETS_WEEKLY);
  const previous = metricTrend?.previous ?? null;

  if (current == null || previous == null) return null;
  if (current <= previous) return null;

  return item(
    {
      id: "engagement:meet-creation-rising",
      category: "engagement",
      title: "Meet creation rising",
      summary: `Meet creation increased from ${previous} to ${current} this week.`,
      recommendation: "Highlight upcoming meets.",
      confidence_score: 88,
      impact_score: impactFromDelta({ category: "engagement", current, previous }),
    },
    context,
  );
}

export function ruleMeetCreationFalling(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.activity.meets_this_week;
  const metricTrend = trend(context, METRIC_KEYS.ACTIVITY_MEETS_WEEKLY);
  const previous = metricTrend?.previous ?? null;

  if (current == null || previous == null) return null;
  if (current >= previous) return null;

  return item(
    {
      id: "engagement:meet-creation-falling",
      category: "engagement",
      title: "Meet creation slowing",
      summary: `Meet creation decreased from ${previous} to ${current} this week.`,
      recommendation: "Encourage hosts to schedule new meets.",
      confidence_score: 85,
      impact_score: impactFromDelta({ category: "engagement", current, previous }),
    },
    context,
  );
}

export function ruleMessagesRising(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.activity.messages_this_week;
  const metricTrend = trend(context, METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY);
  const previous = metricTrend?.previous ?? null;

  if (current == null || previous == null) return null;
  if (current <= previous) return null;

  return item(
    {
      id: "engagement:messages-rising",
      category: "engagement",
      title: "Messaging activity rising",
      summary: `Messages sent this week increased from ${previous} to ${current}.`,
      recommendation: "Keep inbox reliability monitored while engagement is high.",
      confidence_score: 86,
      impact_score: impactFromDelta({ category: "engagement", current, previous }),
    },
    context,
  );
}

export function rulePostsInactive(context: IntelligenceContext): IntelligenceRuleResult {
  const current = context.metrics.activity.posts_this_week;
  if (current == null) return null;
  if (current > 0) return null;

  return item(
    {
      id: "engagement:posts-inactive",
      category: "engagement",
      title: "Post activity quiet",
      summary: "No posts were recorded this week in the latest activity snapshot.",
      recommendation: "Encourage riders to create posts.",
      confidence_score: 80,
      impact_score: impactByCategory("engagement", 5),
    },
    context,
  );
}

export function ruleInfrastructureStable(context: IntelligenceContext): IntelligenceRuleResult {
  if (context.health.systemStatus !== "operational") return null;
  if (context.incidents.open.length > 0) return null;
  if (context.alerts.counts.critical > 0) return null;

  return item(
    {
      id: "operations:infrastructure-stable",
      category: "operations",
      title: "Infrastructure stable",
      summary: "No major incidents or critical alerts detected.",
      recommendation: "Continue monitoring.",
      confidence_score: 100,
      impact_score: impactByCategory("operations"),
    },
    context,
  );
}

export function ruleInfrastructureDegraded(context: IntelligenceContext): IntelligenceRuleResult {
  if (context.health.systemStatus === "operational") return null;

  return item(
    {
      id: "operations:infrastructure-degraded",
      category: "operations",
      title: "Infrastructure degradation detected",
      summary: `Infrastructure status is ${context.health.systemStatus}.`,
      recommendation: "Review infrastructure health checks and integration probes.",
      confidence_score: confidenceFromSignalStrength({ severity: "warning", dataPoints: 2 }),
      impact_score: impactByCategory("operations", 20),
    },
    context,
  );
}

export function ruleWorkflowDegradation(context: IntelligenceContext): IntelligenceRuleResult {
  const degraded = degradedWorkflows(context);
  if (degraded.length === 0) return null;

  const names = degraded.map((workflow) => workflow.display_name).join(", ");

  return item(
    {
      id: "risk:workflow-degradation",
      category: "risk",
      title: "Workflow degradation detected",
      summary: `${names} ${degraded.length === 1 ? "is" : "are"} reporting degraded or warning checks.`,
      recommendation: "Review workflow diagnostics.",
      confidence_score: 95,
      impact_score: impactFromCount("risk", degraded.length, 5),
    },
    context,
  );
}

export function ruleOpenIncidents(context: IntelligenceContext): IntelligenceRuleResult {
  const count = context.incidents.open.length;
  if (count === 0) return null;

  return item(
    {
      id: "risk:open-incidents",
      category: "risk",
      title: "Open incidents require attention",
      summary: `${count} open incident${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} active.`,
      recommendation: "Triage incidents and confirm war room coverage if needed.",
      confidence_score: 92,
      impact_score: impactFromCount("risk", count, 6),
    },
    context,
  );
}

export function ruleCriticalAlerts(context: IntelligenceContext): IntelligenceRuleResult {
  const count = context.alerts.counts.critical;
  if (count === 0) return null;

  return item(
    {
      id: "risk:critical-alerts",
      category: "risk",
      title: "Critical alerts active",
      summary: `${count} critical alert${count === 1 ? "" : "s"} require attention.`,
      recommendation: "Review critical alerts and linked runbooks.",
      confidence_score: 96,
      impact_score: impactFromCount("risk", count, 8),
    },
    context,
  );
}

export function ruleHighPriorityObservations(context: IntelligenceContext): IntelligenceRuleResult {
  const critical = context.observations.active.filter(
    (row) => row.severity === "critical" || row.priority_tier === "high",
  );
  if (critical.length === 0) return null;

  const top = critical[0];

  return item(
    {
      id: "risk:high-priority-insight",
      category: "risk",
      title: "High-priority insight detected",
      summary: top.summary || top.title,
      recommendation: "Review the linked insight and confirm mitigation steps.",
      confidence_score: confidenceFromSignalStrength({ severity: top.severity, dataPoints: 2 }),
      impact_score: impactFromSeverity(top.severity),
    },
    context,
  );
}

export function ruleHighEngagementOpportunity(context: IntelligenceContext): IntelligenceRuleResult {
  const messages = trend(context, METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY);
  const meets = trend(context, METRIC_KEYS.ACTIVITY_MEETS_WEEKLY);

  if (messages?.current == null || messages.previous == null) return null;
  if (meets?.current == null || meets.previous == null) return null;

  const messagesUp = messages.current > messages.previous;
  const meetsStable = Math.abs(meets.current - meets.previous) <= Math.max(1, meets.previous * 0.1);

  if (!messagesUp || !meetsStable) return null;

  return item(
    {
      id: "opportunity:high-engagement-potential",
      category: "opportunity",
      title: "High engagement potential",
      summary: `Messages increased while meet participation remained stable (${meets.previous} → ${meets.current}).`,
      recommendation: "Promote group rides and community events.",
      confidence_score: 75,
      impact_score: impactByCategory("opportunity", 10),
    },
    context,
  );
}

export function ruleBlackcardOpportunity(context: IntelligenceContext): IntelligenceRuleResult {
  const members = context.metrics.blackcard.active_members;
  const messages = trend(context, METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY);

  if (members == null || messages?.current == null || messages.previous == null) return null;
  if (members >= 5) return null;
  if (messages.current <= messages.previous) return null;

  return item(
    {
      id: "opportunity:blackcard-upsell",
      category: "opportunity",
      title: "Blackcard upsell opportunity",
      summary: `Messaging engagement is rising while Blackcard membership remains low (${members}).`,
      recommendation: "Promote Blackcard benefits to active riders.",
      confidence_score: 78,
      impact_score: impactByCategory("opportunity", 8),
    },
    context,
  );
}

export function ruleAcquisitionOpportunity(context: IntelligenceContext): IntelligenceRuleResult {
  const meets = trend(context, METRIC_KEYS.ACTIVITY_MEETS_WEEKLY);
  const signups = trend(context, METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY);

  if (meets?.current == null || meets.previous == null) return null;
  if (signups?.current == null || signups.previous == null) return null;

  const meetsUp = meets.current > meets.previous;
  const signupsFlat = signups.current <= signups.previous;

  if (!meetsUp || !signupsFlat) return null;

  return item(
    {
      id: "opportunity:meet-driven-acquisition",
      category: "opportunity",
      title: "Meet momentum acquisition opportunity",
      summary: `Meet creation is rising (${meets.previous} → ${meets.current}) while weekly signups remain flat (${signups.previous} → ${signups.current}).`,
      recommendation: "Use active meets to drive new rider onboarding.",
      confidence_score: 72,
      impact_score: impactByCategory("opportunity", 6),
    },
    context,
  );
}

export function ruleRevenueObservation(context: IntelligenceContext): IntelligenceRuleResult {
  const revenueInsight = context.observations.active.find(
    (row) =>
      row.category === "revenue" ||
      row.category === "commerce" ||
      row.title.toLowerCase().includes("revenue") ||
      row.title.toLowerCase().includes("mrr"),
  );

  if (!revenueInsight) return null;

  return item(
    {
      id: `revenue:observation:${revenueInsight.id}`,
      category: "revenue",
      title: revenueInsight.title,
      summary: revenueInsight.summary,
      recommendation: "Review revenue metrics and billing workflow health.",
      confidence_score: confidenceFromSignalStrength({
        severity: revenueInsight.severity,
        dataPoints: 2,
      }),
      impact_score: impactFromSeverity(revenueInsight.severity),
    },
    context,
  );
}

export function rulePendingCommands(context: IntelligenceContext): IntelligenceRuleResult {
  const pending = context.commands.counts.pending_approval;
  if (pending === 0) return null;

  return item(
    {
      id: "operations:commands-pending",
      category: "operations",
      title: "Commands awaiting owner approval",
      summary: `${pending} command recommendation${pending === 1 ? "" : "s"} ${pending === 1 ? "is" : "are"} pending approval.`,
      recommendation: "Review pending command recommendations in Nexus Commands.",
      confidence_score: 90,
      impact_score: impactFromCount("operations", pending, 4),
    },
    context,
  );
}

export const INTELLIGENCE_RULES = [
  ruleUserGrowthSlowing,
  ruleUserGrowthAccelerating,
  ruleWeeklySignupsSlowing,
  ruleBlackcardStagnant,
  ruleBlackcardGrowing,
  ruleMrrDeclining,
  ruleMrrGrowing,
  ruleMeetCreationRising,
  ruleMeetCreationFalling,
  ruleMessagesRising,
  rulePostsInactive,
  ruleInfrastructureStable,
  ruleInfrastructureDegraded,
  ruleWorkflowDegradation,
  ruleOpenIncidents,
  ruleCriticalAlerts,
  ruleHighPriorityObservations,
  ruleHighEngagementOpportunity,
  ruleBlackcardOpportunity,
  ruleAcquisitionOpportunity,
  ruleRevenueObservation,
  rulePendingCommands,
] as const;
