import type { SupabaseClient } from "@supabase/supabase-js";
import { loadReportContext } from "@/lib/reports/context";
import { createNexusServiceClient } from "@/lib/nexus/client";
import {
  CORE_TREND_METRIC_KEYS,
  loadMetricSnapshotTrends,
} from "@/lib/metrics/trends";
import { generateCorrelationItems } from "@/lib/correlations/rules";
import type {
  CorrelationContext,
  CorrelationDeploymentRow,
  CorrelationMemoryRow,
  CorrelationCommandRow,
  CorrelationWindow,
  MetricTrend,
} from "@/lib/correlations/types";

function windowToMs(window: CorrelationWindow): number {
  if (window === "24h") return 24 * 60 * 60_000;
  if (window === "7d") return 7 * 24 * 60 * 60_000;
  return 30 * 24 * 60 * 60_000;
}

async function loadDeployments(
  admin: SupabaseClient,
  windowStart: string,
): Promise<CorrelationDeploymentRow[]> {
  const { data, error } = await admin
    .from("nexus_deployments")
    .select("id, deployment_id, environment, status, started_at, finished_at, commit_message")
    .eq("environment", "production")
    .gte("started_at", windowStart)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CorrelationDeploymentRow[];
}

async function loadMemoryEntries(
  supabase: SupabaseClient,
  windowStart: string,
): Promise<CorrelationMemoryRow[]> {
  const { data, error } = await supabase
    .from("nexus_memory_entries")
    .select("id, entry_type, title, summary, occurred_at, importance_score")
    .gte("occurred_at", windowStart)
    .order("occurred_at", { ascending: false })
    .limit(30);

  if (error) {
    return [];
  }

  return (data ?? []) as CorrelationMemoryRow[];
}

async function loadRecentCommands(
  supabase: SupabaseClient,
  windowStart: string,
): Promise<CorrelationCommandRow[]> {
  const { data, error } = await supabase
    .from("nexus_commands")
    .select("id, title, status, updated_at")
    .in("status", ["approved", "completed", "executed"])
    .gte("updated_at", windowStart)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    return [];
  }

  return (data ?? []) as CorrelationCommandRow[];
}

async function countPostDeploymentSignals(
  admin: SupabaseClient,
  deployment: CorrelationDeploymentRow | undefined,
): Promise<{ incidents: number; criticalAlerts: number }> {
  if (!deployment) {
    return { incidents: 0, criticalAlerts: 0 };
  }

  const anchor = deployment.finished_at ?? deployment.started_at;
  const end = new Date(new Date(anchor).getTime() + 24 * 60 * 60_000).toISOString();

  const [{ count: incidentCount }, { count: alertCount }] = await Promise.all([
    admin
      .from("nexus_incidents")
      .select("id", { count: "exact", head: true })
      .gte("started_at", anchor)
      .lte("started_at", end),
    admin
      .from("nexus_alerts")
      .select("id", { count: "exact", head: true })
      .eq("severity", "critical")
      .gte("created_at", anchor)
      .lte("created_at", end),
  ]);

  return {
    incidents: incidentCount ?? 0,
    criticalAlerts: alertCount ?? 0,
  };
}

export async function loadCorrelationContext(
  supabase: SupabaseClient,
  window: CorrelationWindow,
): Promise<CorrelationContext> {
  const admin = createNexusServiceClient();
  const windowStart = new Date(Date.now() - windowToMs(window)).toISOString();
  const generated_at = new Date().toISOString();

  const [reportContext, trends, deployments, memory_entries, recent_commands] = await Promise.all([
    loadReportContext(supabase),
    loadMetricSnapshotTrends(supabase, CORE_TREND_METRIC_KEYS) as Promise<
      Record<string, MetricTrend>
    >,
    loadDeployments(admin, windowStart),
    loadMemoryEntries(supabase, windowStart),
    loadRecentCommands(supabase, windowStart),
  ]);

  const postDeployment = await countPostDeploymentSignals(admin, deployments[0]);

  return {
    generated_at,
    window,
    window_start: windowStart,
    window_end: generated_at,
    metrics: reportContext.metrics,
    health: reportContext.health,
    mission: reportContext.mission,
    alerts: reportContext.alerts,
    incidents: reportContext.incidents,
    observations: reportContext.observations,
    commands: reportContext.commands,
    trends,
    deployments,
    memory_entries,
    recent_commands,
    post_deployment_incidents: postDeployment.incidents,
    post_deployment_critical_alerts: postDeployment.criticalAlerts,
  };
}

export async function buildCorrelationItems(
  supabase: SupabaseClient,
  window: CorrelationWindow,
) {
  const context = await loadCorrelationContext(supabase, window);
  return {
    context,
    items: generateCorrelationItems(context),
  };
}
