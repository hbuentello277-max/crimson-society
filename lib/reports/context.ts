import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusAlertsSummary } from "@/lib/alerts/summary";
import { getNexusCommandsSummary } from "@/lib/commands/summary";
import { getNexusIncidentsSummary } from "@/lib/incidents/summary";
import { getNexusMetricsSummary } from "@/lib/metrics/summary";
import { countTableRows, daysAgoIso } from "@/lib/metrics/query-utils";
import { getNexusHealthSnapshot } from "@/lib/monitoring/health-summary";
import { getMissionHealthSnapshot } from "@/lib/mission-health/summary";
import { getNexusObservationsSummary } from "@/lib/observations/summary";
import { createNexusServiceClient } from "@/lib/nexus/client";
import type { ReportInsightRef, ReportWorkflowRef } from "@/lib/reports/types";

export type ReportContext = {
  collected_at: string;
  metrics: Awaited<ReturnType<typeof getNexusMetricsSummary>>;
  health: Awaited<ReturnType<typeof getNexusHealthSnapshot>>;
  mission: Awaited<ReturnType<typeof getMissionHealthSnapshot>>;
  alerts: Awaited<ReturnType<typeof getNexusAlertsSummary>>;
  incidents: Awaited<ReturnType<typeof getNexusIncidentsSummary>>;
  observations: Awaited<ReturnType<typeof getNexusObservationsSummary>>;
  commands: Awaited<ReturnType<typeof getNexusCommandsSummary>>;
  monthly_activity: {
    posts: number | null;
    meets: number | null;
    messages: number | null;
    unavailable: string[];
  };
};

export async function loadReportContext(supabase: SupabaseClient): Promise<ReportContext> {
  const monthStart = daysAgoIso(30);
  const admin = createNexusServiceClient();

  const [metrics, health, mission, alerts, incidents, observations, commands, postsMonth, meetsMonth, messagesMonth] =
    await Promise.all([
      getNexusMetricsSummary(supabase),
      getNexusHealthSnapshot(supabase),
      getMissionHealthSnapshot(supabase),
      getNexusAlertsSummary(supabase),
      getNexusIncidentsSummary(supabase),
      getNexusObservationsSummary(supabase, { view: "active" }),
      getNexusCommandsSummary(supabase),
      countTableRows(admin, "Posts", { sinceIso: monthStart }),
      countTableRows(admin, "rides", { sinceIso: monthStart }),
      countTableRows(admin, "messages", { sinceIso: monthStart }),
    ]);

  const unavailable: string[] = [];
  if (postsMonth.error) unavailable.push("posts_this_month");
  if (meetsMonth.error) unavailable.push("meets_this_month");
  if (messagesMonth.error) unavailable.push("messages_this_month");

  return {
    collected_at: metrics.collected_at ?? new Date().toISOString(),
    metrics,
    health,
    mission,
    alerts,
    incidents,
    observations,
    commands,
    monthly_activity: {
      posts: postsMonth.error ? null : postsMonth.count,
      meets: meetsMonth.error ? null : meetsMonth.count,
      messages: messagesMonth.error ? null : messagesMonth.count,
      unavailable,
    },
  };
}

export function mapInsightRefs(
  rows: Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    priority_score: number;
  }>,
  limit = 5,
): ReportInsightRef[] {
  return rows.slice(0, limit).map((row) => ({
    id: row.id,
    title: row.title,
    severity: row.severity,
    category: row.category,
    priority_score: row.priority_score,
  }));
}

export function mapWorkflowRefs(
  workflows: Array<{
    slug: string;
    display_name: string;
    workflow_status: string;
    workflow_score: number | null;
    success_rate_1h: number | null;
  }>,
  limit = 5,
): ReportWorkflowRef[] {
  const sorted = [...workflows].sort((a, b) => {
    const degraded = (status: string) =>
      ["degraded", "impaired", "critical", "failing"].includes(status.toLowerCase()) ? 0 : 1;
    const statusDiff = degraded(a.workflow_status) - degraded(b.workflow_status);
    if (statusDiff !== 0) return statusDiff;
    return (b.success_rate_1h ?? 0) - (a.success_rate_1h ?? 0);
  });

  return sorted.slice(0, limit).map((workflow) => ({
    slug: workflow.slug,
    display_name: workflow.display_name,
    workflow_status: workflow.workflow_status,
    workflow_score: workflow.workflow_score,
    success_rate_1h: workflow.success_rate_1h,
  }));
}

export function buildGrowthSignals(context: ReportContext): string[] {
  const signals: string[] = [];
  const { growth } = context.metrics;

  if (growth.new_users_this_week != null && growth.new_users_this_week > 0) {
    signals.push(`${growth.new_users_this_week} new users joined this week`);
  }

  if (growth.new_users_this_month != null && growth.new_users_this_month > 0) {
    signals.push(`${growth.new_users_this_month} new users joined in the last 30 days`);
  }

  if (context.metrics.blackcard.conversion_estimate_available && context.metrics.blackcard.conversion_estimate != null) {
    signals.push(
      `Blackcard conversion estimate ${Math.round(context.metrics.blackcard.conversion_estimate * 100)}% this month`,
    );
  }

  for (const observation of context.observations.active) {
    if (observation.category === "growth" || observation.title.toLowerCase().includes("growth")) {
      signals.push(observation.title);
    }
  }

  return signals.slice(0, 5);
}

export function buildRevenueObservations(context: ReportContext): ReportInsightRef[] {
  const revenueRows = context.observations.active.filter(
    (row) =>
      row.category === "revenue" ||
      row.category === "commerce" ||
      row.title.toLowerCase().includes("revenue") ||
      row.title.toLowerCase().includes("mrr"),
  );

  return mapInsightRefs(revenueRows);
}

export function buildActivityTrends(context: ReportContext): string[] {
  const trends: string[] = [];
  const { activity } = context.metrics;

  if (activity.posts_this_week != null) {
    trends.push(`${activity.posts_this_week} posts created this week`);
  }
  if (activity.meets_this_week != null) {
    trends.push(`${activity.meets_this_week} meets created this week`);
  }
  if (activity.messages_this_week != null) {
    trends.push(`${activity.messages_this_week} messages sent this week`);
  }
  if (context.monthly_activity.posts != null) {
    trends.push(`${context.monthly_activity.posts} posts created in the last 30 days`);
  }

  return trends.slice(0, 6);
}

export function buildRiskLines(context: ReportContext): string[] {
  const risks: string[] = [];

  if (context.alerts.counts.critical > 0) {
    risks.push(`${context.alerts.counts.critical} critical alert(s) require attention`);
  }
  if (context.incidents.open.length > 0) {
    risks.push(`${context.incidents.open.length} open incident(s) in progress`);
  }
  if (context.health.systemStatus !== "operational") {
    risks.push(`Infrastructure status is ${context.health.systemStatus}`);
  }
  if (["degraded", "impaired", "critical", "failing"].includes(context.mission.status.toLowerCase())) {
    risks.push(`User workflows are ${context.mission.status}`);
  }

  for (const observation of context.observations.active) {
    if (observation.severity === "critical" || observation.priority_tier === "high") {
      risks.push(observation.title);
    }
  }

  return risks.slice(0, 8);
}

export function buildOwnerFocus(context: ReportContext): string[] {
  const focus: string[] = [];

  if (context.alerts.counts.critical > 0) {
    focus.push("Review critical alerts and linked runbooks");
  }
  if (context.incidents.open.length > 0) {
    focus.push("Triage open incidents and confirm war room coverage");
  }
  if (context.commands.counts.pending_approval > 0) {
    focus.push(`Review ${context.commands.counts.pending_approval} command(s) pending approval`);
  }
  if (context.commands.counts.suggested > 0) {
    focus.push(`Evaluate ${context.commands.counts.suggested} suggested command recommendation(s)`);
  }
  if (context.observations.active.length > 0) {
    focus.push("Review active insights for revenue, growth, and infrastructure signals");
  }
  if (context.metrics.revenue.estimated_mrr == null) {
    focus.push("Verify metrics rollup cron is producing revenue snapshots");
  }
  if (focus.length === 0) {
    focus.push("No urgent operational focus detected — review weekly executive summary");
  }

  return focus.slice(0, 6);
}

export function collectUnavailableMetrics(context: ReportContext): string[] {
  const unavailable = new Set<string>(context.monthly_activity.unavailable);

  if (context.metrics.collected_at == null || context.metrics.snapshot_count === 0) {
    unavailable.add("nexus_metrics_snapshots");
  }
  if (context.metrics.growth.total_users == null) unavailable.add("total_users");
  if (context.metrics.revenue.estimated_mrr == null) unavailable.add("estimated_mrr");
  if (context.metrics.activity.posts_this_week == null) unavailable.add("posts_this_week");

  return Array.from(unavailable);
}
