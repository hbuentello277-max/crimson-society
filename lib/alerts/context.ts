import type { SupabaseClient } from "@supabase/supabase-js";
import { computeMissionHealthFromChecks } from "@/lib/mission-health/scoring";
import type { MissionCheckResult } from "@/lib/mission-health/types";
import { MISSION_WORKFLOW_REGISTRY, MISSION_WORKFLOW_SLUGS } from "@/lib/mission-health/workflows";
import { METRIC_KEYS } from "@/lib/metrics/types";
import { NEXUS_INTEGRATION_SLUGS } from "@/lib/nexus/constants";
import type {
  AlertEvaluationContext,
  AlertRuleRow,
  DeploymentSnapshot,
  IntegrationSnapshot,
  MetricSnapshot,
  ScopeState,
  WorkflowSnapshot,
} from "@/lib/alerts/types";

const METRIC_HISTORY_LIMIT = 500;
const DEPLOYMENT_WINDOW_MS = 24 * 60 * 60_000;

function parseEvaluationState(metadata: Record<string, unknown>): Record<string, ScopeState> {
  const raw = metadata.evaluation_state;
  if (!raw || typeof raw !== "object") {
    return {};
  }

  return raw as Record<string, ScopeState>;
}

export async function loadAlertRules(admin: SupabaseClient): Promise<AlertRuleRow[]> {
  const { data, error } = await admin
    .from("nexus_alert_rules")
    .select("id, rule_id, name, category, severity, condition, enabled, cooldown_minutes, metadata")
    .eq("enabled", true)
    .order("severity", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    rule_id: row.rule_id as string,
    name: row.name as string,
    category: row.category as string,
    severity: row.severity as AlertRuleRow["severity"],
    condition: (row.condition as AlertRuleRow["condition"]) ?? { type: "unknown" },
    enabled: row.enabled as boolean,
    cooldown_minutes: row.cooldown_minutes as number,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));
}

async function computeMissionScore(admin: SupabaseClient): Promise<number | null> {
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: workflows } = await admin
    .from("nexus_mission_workflows")
    .select("id, slug")
    .in("slug", [...MISSION_WORKFLOW_SLUGS]);

  const workflowById = new Map((workflows ?? []).map((row) => [row.id as string, row.slug as string]));
  const workflowIds = [...workflowById.keys()];
  if (workflowIds.length === 0) {
    return null;
  }

  const { data: checks } = await admin
    .from("nexus_mission_checks")
    .select("workflow_id, status, check_method, latency_ms, details, checked_at")
    .in("workflow_id", workflowIds)
    .gte("checked_at", since)
    .order("checked_at", { ascending: false })
    .limit(200);

  const latestByWorkflow = new Map<string, MissionCheckResult>();
  for (const row of checks ?? []) {
    const workflowId = row.workflow_id as string;
    if (latestByWorkflow.has(workflowId)) {
      continue;
    }

    const slug = workflowById.get(workflowId);
    if (!slug || !(slug in MISSION_WORKFLOW_REGISTRY)) {
      continue;
    }

    const status = row.status as MissionCheckResult["status"];
    latestByWorkflow.set(workflowId, {
      workflow_slug: slug as MissionCheckResult["workflow_slug"],
      status,
      check_method: row.check_method as MissionCheckResult["check_method"],
      latency_ms: (row.latency_ms as number | null) ?? null,
      details: (row.details as Record<string, unknown>) ?? {},
      checked_at: row.checked_at as string,
      workflow_score: status === "pass" ? 100 : status === "warn" ? 75 : 25,
    });
  }

  const checkResults = [...latestByWorkflow.values()];
  if (checkResults.length === 0) {
    return null;
  }

  return computeMissionHealthFromChecks(checkResults, MISSION_WORKFLOW_REGISTRY).score;
}

async function loadDerivedSignals(admin: SupabaseClient): Promise<Record<string, number | null>> {
  const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const [webhookFailed, pushPending, emailFailed, userReports] = await Promise.all([
    admin
      .from("stripe_webhook_events")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("received_at", oneHourAgo),
    admin
      .from("push_notification_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("shop_order_email_events")
      .select("*", { count: "exact", head: true })
      .gte("sent_at", oneDayAgo),
    admin
      .from("user_reports")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo),
  ]);

  return {
    stripe_webhook_failed_1h: webhookFailed.error ? null : (webhookFailed.count ?? 0),
    push_pending_count: pushPending.error ? null : (pushPending.count ?? 0),
    shop_order_email_events_24h: emailFailed.error ? null : (emailFailed.count ?? 0),
    user_reports_24h: userReports.error ? null : (userReports.count ?? 0),
    login_failures_1h: null,
    blackcard_cancellations_daily: null,
  };
}

export async function buildAlertEvaluationContext(
  admin: SupabaseClient,
  rules: AlertRuleRow[],
): Promise<AlertEvaluationContext> {
  const evaluated_at = new Date().toISOString();
  const metricKeys = Object.values(METRIC_KEYS);
  const sinceDeployments = new Date(Date.now() - DEPLOYMENT_WINDOW_MS).toISOString();

  const [
    integrationsResult,
    workflowsResult,
    metricsResult,
    deploymentsResult,
    missionScore,
    derived,
  ] = await Promise.all([
    admin
      .from("nexus_integrations")
      .select("id, slug, status, last_check_at")
      .in("slug", [...NEXUS_INTEGRATION_SLUGS]),
    admin
      .from("nexus_mission_workflows")
      .select("id, slug, display_name, status, last_check_at")
      .in("slug", [...MISSION_WORKFLOW_SLUGS]),
    admin
      .from("nexus_metrics_snapshots")
      .select("metric_key, value, previous_value, period_start")
      .in("metric_key", metricKeys)
      .order("period_start", { ascending: false })
      .limit(METRIC_HISTORY_LIMIT),
    admin
      .from("nexus_deployments")
      .select("id, environment, status, started_at")
      .gte("started_at", sinceDeployments)
      .order("started_at", { ascending: false })
      .limit(50),
    computeMissionScore(admin),
    loadDerivedSignals(admin),
  ]);

  if (integrationsResult.error) {
    throw new Error(integrationsResult.error.message);
  }

  if (workflowsResult.error) {
    throw new Error(workflowsResult.error.message);
  }

  if (metricsResult.error) {
    throw new Error(metricsResult.error.message);
  }

  const integrations: Record<string, IntegrationSnapshot> = {};
  for (const row of integrationsResult.data ?? []) {
    integrations[row.slug as string] = {
      id: row.id as string,
      slug: row.slug as string,
      status: row.status as string,
      last_check_at: (row.last_check_at as string | null) ?? null,
    };
  }

  const mission_workflows: Record<string, WorkflowSnapshot> = {};
  for (const row of workflowsResult.data ?? []) {
    mission_workflows[row.slug as string] = {
      id: row.id as string,
      slug: row.slug as string,
      display_name: row.display_name as string,
      status: row.status as string,
      last_check_at: (row.last_check_at as string | null) ?? null,
    };
  }

  const metrics: Record<string, MetricSnapshot> = {};
  const metric_history: Record<string, MetricSnapshot[]> = {};
  for (const row of metricsResult.data ?? []) {
    const key = row.metric_key as string;
    const snapshot: MetricSnapshot = {
      value: Number(row.value),
      previous_value: row.previous_value === null ? null : Number(row.previous_value),
      period_start: row.period_start as string,
    };

    if (!metrics[key]) {
      metrics[key] = snapshot;
    }

    if (!metric_history[key]) {
      metric_history[key] = [];
    }
    metric_history[key].push(snapshot);
  }

  const deployments: DeploymentSnapshot[] = (deploymentsResult.data ?? []).map((row) => ({
    id: row.id as string,
    environment: row.environment as string,
    status: row.status as string,
    started_at: row.started_at as string,
  }));

  const evaluation_state: Record<string, ScopeState> = {};
  for (const rule of rules) {
    Object.assign(evaluation_state, parseEvaluationState(rule.metadata));
  }

  const contextMetrics = { ...metrics };
  if (missionScore !== null) {
    contextMetrics["mission.health_score"] = {
      value: missionScore,
      previous_value: null,
      period_start: evaluated_at,
    };
  }

  return {
    evaluated_at,
    integrations,
    mission_workflows,
    mission_score: missionScore,
    metrics: contextMetrics,
    metric_history,
    deployments,
    derived,
    evaluation_state,
  };
}

export function countFailingWorkflows(context: AlertEvaluationContext): number {
  return Object.values(context.mission_workflows).filter((row) => row.status === "failing").length;
}

export function countDownIntegrations(context: AlertEvaluationContext): number {
  return Object.values(context.integrations).filter((row) => row.status === "down").length;
}
