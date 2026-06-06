import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NexusObservationSummaryRow,
  NexusObservationsSummary,
  ObservationsListView,
  ObservationType,
} from "@/lib/observations/types";
import type { NexusSeverity } from "@/lib/nexus/constants";

const HISTORY_WINDOW_MS = 7 * 24 * 60 * 60_000;

function severityWeight(severity: NexusSeverity): number {
  if (severity === "critical") {
    return 2;
  }

  if (severity === "warning") {
    return 1.5;
  }

  return 1;
}

function recencyFactor(occurredAt: string, collectedAt: string): number {
  const ageMs = new Date(collectedAt).getTime() - new Date(occurredAt).getTime();
  if (ageMs < 60 * 60_000) {
    return 1;
  }

  if (ageMs < 6 * 60 * 60_000) {
    return 0.9;
  }

  if (ageMs < 24 * 60 * 60_000) {
    return 0.75;
  }

  return 0.6;
}

function priorityScore(
  confidence: number,
  severity: NexusSeverity,
  occurredAt: string,
  collectedAt: string,
): number {
  return Math.round(confidence * severityWeight(severity) * recencyFactor(occurredAt, collectedAt) * 1000) / 1000;
}

async function countJunctions(
  supabase: SupabaseClient,
  observationId: string,
): Promise<{ alerts: number; metrics: number }> {
  const [alerts, metrics] = await Promise.all([
    supabase
      .from("nexus_observation_alerts")
      .select("*", { count: "exact", head: true })
      .eq("observation_id", observationId),
    supabase
      .from("nexus_observation_metrics")
      .select("*", { count: "exact", head: true })
      .eq("observation_id", observationId),
  ]);

  return {
    alerts: alerts.error ? 0 : (alerts.count ?? 0),
    metrics: metrics.error ? 0 : (metrics.count ?? 0),
  };
}

function mapObservationRow(
  row: Record<string, unknown>,
  collectedAt: string,
  junctionCounts: { alerts: number; metrics: number },
): NexusObservationSummaryRow {
  const confidence = Number(row.confidence);
  const severity = row.severity as NexusSeverity;
  const occurredAt = row.occurred_at as string;
  const evidence = (row.evidence as Record<string, unknown>) ?? {};
  const metadata = (row.metadata as Record<string, unknown>) ?? {};

  return {
    id: row.id as string,
    observation_type: row.observation_type as ObservationType,
    category: row.category as string,
    severity,
    confidence,
    priority_score: priorityScore(confidence, severity, occurredAt, collectedAt),
    title: row.title as string,
    summary: row.summary as string,
    rule_id: (row.rule_id as string | null) ?? null,
    status: row.status as NexusObservationSummaryRow["status"],
    occurred_at: occurredAt,
    valid_until: (row.valid_until as string | null) ?? null,
    incident_id: (row.incident_id as string | null) ?? null,
    linked_alerts_count: junctionCounts.alerts,
    linked_metrics_count: junctionCounts.metrics,
    evidence,
    metadata,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function getNexusObservationsSummary(
  supabase: SupabaseClient,
  options?: { view?: ObservationsListView },
): Promise<NexusObservationsSummary> {
  const view = options?.view ?? "all";
  const collected_at = new Date().toISOString();
  const historySince = new Date(Date.now() - HISTORY_WINDOW_MS).toISOString();

  const [{ data: activeRows, error: activeError }, { data: historyRows, error: historyError }] =
    await Promise.all([
      supabase
        .from("nexus_observations")
        .select(
          "id, observation_type, category, severity, confidence, title, summary, rule_id, status, occurred_at, valid_until, incident_id, evidence, metadata, created_at, updated_at",
        )
        .eq("status", "active")
        .order("occurred_at", { ascending: false })
        .limit(100),
      supabase
        .from("nexus_observations")
        .select(
          "id, observation_type, category, severity, confidence, title, summary, rule_id, status, occurred_at, valid_until, incident_id, evidence, metadata, created_at, updated_at",
        )
        .in("status", ["superseded", "dismissed", "confirmed"])
        .gte("updated_at", historySince)
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

  if (activeError) {
    throw new Error(activeError.message);
  }

  if (historyError) {
    throw new Error(historyError.message);
  }

  const active = await Promise.all(
    (activeRows ?? []).map(async (row) => {
      const junctionCounts = await countJunctions(supabase, row.id as string);
      return mapObservationRow(row as Record<string, unknown>, collected_at, junctionCounts);
    }),
  );

  active.sort(
    (a, b) => b.priority_score - a.priority_score || b.occurred_at.localeCompare(a.occurred_at),
  );

  const recent_history = await Promise.all(
    (historyRows ?? []).map(async (row) => {
      const junctionCounts = await countJunctions(supabase, row.id as string);
      return mapObservationRow(row as Record<string, unknown>, collected_at, junctionCounts);
    }),
  );

  const counts = {
    info: active.filter((row) => row.severity === "info").length,
    warning: active.filter((row) => row.severity === "warning").length,
    critical: active.filter((row) => row.severity === "critical").length,
    active: active.length,
  };

  if (view === "active") {
    return { collected_at, counts, active, recent_history: [] };
  }

  if (view === "history") {
    return {
      collected_at,
      counts: { info: 0, warning: 0, critical: 0, active: 0 },
      active: [],
      recent_history,
    };
  }

  return {
    collected_at,
    counts,
    active,
    recent_history,
  };
}
