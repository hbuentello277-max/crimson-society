import type { SupabaseClient } from "@supabase/supabase-js";
import { computeMissionHealthFromChecks } from "@/lib/mission-health/scoring";
import type { MissionCheckResult } from "@/lib/mission-health/types";
import { MISSION_WORKFLOW_REGISTRY, MISSION_WORKFLOW_SLUGS } from "@/lib/mission-health/workflows";
import { METRIC_KEYS } from "@/lib/metrics/types";
import { NEXUS_INTEGRATION_SLUGS } from "@/lib/nexus/constants";
import type {
  DeploymentContextSnapshot,
  EventContextSnapshot,
  IntegrationContextSnapshot,
  MetricContextSnapshot,
  ObservationEvaluationContext,
} from "@/lib/observations/types";

const METRIC_HISTORY_LIMIT = 500;
const EVENT_WINDOW_MS = 24 * 60 * 60_000;
const HEALTH_CHECK_WINDOW_MS = 60 * 60_000;
const DEPLOYMENT_WINDOW_MS = 24 * 60 * 60_000;
const STALE_MS = 30 * 60_000;

function mapMissionStatus(
  score: number | null,
  failingCount: number,
  warningCount: number,
): "healthy" | "degraded" | "critical" | null {
  if (score === null) {
    return null;
  }

  if (score < 70 || failingCount >= 2) {
    return "critical";
  }

  if (score < 90 || warningCount >= 1 || failingCount >= 1) {
    return "degraded";
  }

  return "healthy";
}

function extractIntegrationIssues(
  status: string,
  healthDetails: Array<Record<string, unknown>>,
): string[] {
  const issues: string[] = [];

  if (status === "down") {
    issues.push("integration is down");
  } else if (status === "degraded") {
    issues.push("integration is degraded");
  }

  for (const details of healthDetails) {
    const reason = typeof details.reason === "string" ? details.reason : null;
    if (reason && /not set/i.test(reason)) {
      issues.push(reason);
    }
  }

  return [...new Set(issues)];
}

async function computeMissionContext(admin: SupabaseClient): Promise<{
  score: number | null;
  status: "healthy" | "degraded" | "critical" | null;
  workflows: ObservationEvaluationContext["mission"]["workflows"];
  warning_workflows: string[];
  failing_workflows: string[];
}> {
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: workflows } = await admin
    .from("nexus_mission_workflows")
    .select("id, slug, display_name, status, last_check_at")
    .in("slug", [...MISSION_WORKFLOW_SLUGS]);

  const workflowRows = workflows ?? [];
  const workflowById = new Map(workflowRows.map((row) => [row.id as string, row.slug as string]));
  const workflowIds = workflowRows.map((row) => row.id as string);

  let score: number | null = null;
  if (workflowIds.length > 0) {
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
    if (checkResults.length > 0) {
      score = computeMissionHealthFromChecks(checkResults, MISSION_WORKFLOW_REGISTRY).score;
    }
  }

  const missionWorkflows: ObservationEvaluationContext["mission"]["workflows"] = {};
  const warning_workflows: string[] = [];
  const failing_workflows: string[] = [];

  for (const row of workflowRows) {
    const slug = row.slug as string;
    const status = row.status as string;
    missionWorkflows[slug] = {
      id: row.id as string,
      status,
      display_name: row.display_name as string,
      last_check_at: (row.last_check_at as string | null) ?? null,
    };

    if (status === "degraded") {
      warning_workflows.push(slug);
    }

    if (status === "failing") {
      failing_workflows.push(slug);
    }
  }

  const status = mapMissionStatus(score, failing_workflows.length, warning_workflows.length);

  return {
    score,
    status,
    workflows: missionWorkflows,
    warning_workflows,
    failing_workflows,
  };
}

export async function buildObservationEvaluationContext(
  admin: SupabaseClient,
): Promise<ObservationEvaluationContext> {
  const evaluated_at = new Date().toISOString();
  const metricKeys = Object.values(METRIC_KEYS);
  const sinceEvents = new Date(Date.now() - EVENT_WINDOW_MS).toISOString();
  const sinceHealthChecks = new Date(Date.now() - HEALTH_CHECK_WINDOW_MS).toISOString();
  const sinceDeployments = new Date(Date.now() - DEPLOYMENT_WINDOW_MS).toISOString();

  const [
    mission,
    integrationsResult,
    metricsResult,
    alertsResult,
    incidentsResult,
    eventsResult,
    deploymentsResult,
    healthChecksResult,
  ] = await Promise.all([
    computeMissionContext(admin),
    admin
      .from("nexus_integrations")
      .select("id, slug, status, last_check_at")
      .in("slug", [...NEXUS_INTEGRATION_SLUGS]),
    admin
      .from("nexus_metrics_snapshots")
      .select("id, metric_key, value, previous_value, period_start")
      .in("metric_key", metricKeys)
      .order("period_start", { ascending: false })
      .limit(METRIC_HISTORY_LIMIT),
    admin
      .from("nexus_alerts")
      .select("id, rule_id, category, severity, title, status")
      .in("status", ["active", "acknowledged"])
      .order("updated_at", { ascending: false })
      .limit(100),
    admin
      .from("nexus_incidents")
      .select("id, severity, status, title")
      .in("status", ["open", "investigating", "mitigated"])
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("nexus_events")
      .select("id, event_type, category, severity, occurred_at")
      .gte("occurred_at", sinceEvents)
      .order("occurred_at", { ascending: false })
      .limit(100),
    admin
      .from("nexus_deployments")
      .select("id, environment, status, started_at")
      .gte("started_at", sinceDeployments)
      .order("started_at", { ascending: false })
      .limit(1),
    admin
      .from("nexus_health_checks")
      .select("integration_id, status, details, checked_at")
      .gte("checked_at", sinceHealthChecks)
      .order("checked_at", { ascending: false })
      .limit(200),
  ]);

  if (integrationsResult.error) {
    throw new Error(integrationsResult.error.message);
  }

  if (metricsResult.error) {
    throw new Error(metricsResult.error.message);
  }

  if (alertsResult.error) {
    throw new Error(alertsResult.error.message);
  }

  if (incidentsResult.error) {
    throw new Error(incidentsResult.error.message);
  }

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }

  const integrationIdToSlug = new Map<string, string>();
  for (const row of integrationsResult.data ?? []) {
    integrationIdToSlug.set(row.id as string, row.slug as string);
  }

  const healthDetailsBySlug = new Map<string, Array<Record<string, unknown>>>();
  for (const row of healthChecksResult.data ?? []) {
    const slug = integrationIdToSlug.get(row.integration_id as string);
    if (!slug) {
      continue;
    }

    const details = (row.details as Record<string, unknown>) ?? {};
    const existing = healthDetailsBySlug.get(slug) ?? [];
    if (existing.length < 5) {
      existing.push(details);
      healthDetailsBySlug.set(slug, existing);
    }
  }

  const integrations: Record<string, IntegrationContextSnapshot> = {};
  for (const row of integrationsResult.data ?? []) {
    const slug = row.slug as string;
    const status = row.status as string;
    integrations[slug] = {
      id: row.id as string,
      slug,
      status,
      last_check_at: (row.last_check_at as string | null) ?? null,
      issues: extractIntegrationIssues(status, healthDetailsBySlug.get(slug) ?? []),
    };
  }

  const metrics: Record<string, MetricContextSnapshot> = {};
  const metric_history: Record<string, Array<{ value: number; period_start: string }>> = {};
  for (const row of metricsResult.data ?? []) {
    const key = row.metric_key as string;
    const snapshot: MetricContextSnapshot = {
      id: row.id as string,
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
    metric_history[key].push({
      value: snapshot.value,
      period_start: snapshot.period_start,
    });
  }

  const activeAlerts = (alertsResult.data ?? []).map((row) => ({
    id: row.id as string,
    rule_id: (row.rule_id as string | null) ?? null,
    category: row.category as string,
    severity: row.severity as ObservationEvaluationContext["alerts"]["active"][number]["severity"],
    title: row.title as string,
    status: row.status as string,
  }));

  const active_by_category: Record<string, number> = {};
  let active_critical = 0;
  let active_warning = 0;
  for (const alert of activeAlerts) {
    active_by_category[alert.category] = (active_by_category[alert.category] ?? 0) + 1;
    if (alert.severity === "critical") {
      active_critical += 1;
    } else if (alert.severity === "warning") {
      active_warning += 1;
    }
  }

  const openIncidents = (incidentsResult.data ?? []).map((row) => ({
    id: row.id as string,
    severity: row.severity as ObservationEvaluationContext["incidents"]["open"][number]["severity"],
    status: row.status as string,
    title: row.title as string,
  }));

  const open_critical = openIncidents.filter((row) => row.severity === "critical").length;

  const recent_events: EventContextSnapshot[] = (eventsResult.data ?? []).map((row) => ({
    id: row.id as string,
    event_type: row.event_type as string,
    category: row.category as string,
    severity: row.severity as EventContextSnapshot["severity"],
    occurred_at: row.occurred_at as string,
  }));

  const latestDeploymentRow = deploymentsResult.data?.[0];
  const latest_deployment: DeploymentContextSnapshot | null = latestDeploymentRow
    ? {
        id: latestDeploymentRow.id as string,
        environment: latestDeploymentRow.environment as string,
        status: latestDeploymentRow.status as string,
        started_at: latestDeploymentRow.started_at as string,
      }
    : null;

  return {
    evaluated_at,
    mission,
    integrations,
    metrics,
    metric_history,
    alerts: {
      active: activeAlerts,
      active_critical,
      active_warning,
      active_by_category,
    },
    incidents: {
      open: openIncidents,
      open_critical,
      open_total: openIncidents.length,
      open_ids: openIncidents.map((row) => row.id),
    },
    recent_events,
    latest_deployment,
  };
}

export function isSourceStale(lastCheckAt: string | null, evaluatedAt: string): boolean {
  if (!lastCheckAt) {
    return true;
  }

  return (
    new Date(evaluatedAt).getTime() - new Date(lastCheckAt).getTime() > STALE_MS
  );
}
