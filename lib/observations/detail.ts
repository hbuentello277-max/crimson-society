import type { SupabaseClient } from "@supabase/supabase-js";
import { parseOwnerNotes } from "@/lib/alerts/notes";
import type {
  NexusObservationDetail,
  NexusObservationSummaryRow,
  ObservationEvidenceAlertRef,
  ObservationEvidenceEventRef,
  ObservationEvidenceMetricRef,
  ObservationType,
} from "@/lib/observations/types";
import type { NexusSeverity } from "@/lib/nexus/constants";

function priorityScore(
  confidence: number,
  severity: NexusSeverity,
  occurredAt: string,
  collectedAt: string,
): number {
  const severityWeight = severity === "critical" ? 2 : severity === "warning" ? 1.5 : 1;
  const ageMs = new Date(collectedAt).getTime() - new Date(occurredAt).getTime();
  const recencyFactor =
    ageMs < 60 * 60_000 ? 1 : ageMs < 6 * 60 * 60_000 ? 0.9 : ageMs < 24 * 60 * 60_000 ? 0.75 : 0.6;
  return Math.round(confidence * severityWeight * recencyFactor * 1000) / 1000;
}

function mapSummaryFields(
  row: Record<string, unknown>,
  collectedAt: string,
  junctionCounts: { alerts: number; metrics: number },
): NexusObservationSummaryRow {
  const confidence = Number(row.confidence);
  const severity = row.severity as NexusSeverity;
  const occurredAt = row.occurred_at as string;

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
    evidence: (row.evidence as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

async function loadEvidenceLinks(
  supabase: SupabaseClient,
  observationId: string,
): Promise<NexusObservationDetail["evidence_links"]> {
  const [eventLinks, metricLinks, alertLinks] = await Promise.all([
    supabase
      .from("nexus_observation_events")
      .select("relevance, event_id")
      .eq("observation_id", observationId),
    supabase
      .from("nexus_observation_metrics")
      .select("role, snapshot_id")
      .eq("observation_id", observationId),
    supabase
      .from("nexus_observation_alerts")
      .select("relationship, alert_id")
      .eq("observation_id", observationId),
  ]);

  const eventIds = (eventLinks.data ?? []).map((row) => row.event_id as string);
  const snapshotIds = (metricLinks.data ?? []).map((row) => row.snapshot_id as string);
  const alertIds = (alertLinks.data ?? []).map((row) => row.alert_id as string);

  const [eventsData, metricsData, alertsData] = await Promise.all([
    eventIds.length > 0
      ? supabase
          .from("nexus_events")
          .select("id, event_type, category, severity, title, occurred_at")
          .in("id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    snapshotIds.length > 0
      ? supabase
          .from("nexus_metrics_snapshots")
          .select("id, metric_key, value, previous_value, period_start")
          .in("id", snapshotIds)
      : Promise.resolve({ data: [], error: null }),
    alertIds.length > 0
      ? supabase
          .from("nexus_alerts")
          .select("id, title, severity, status, category")
          .in("id", alertIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const eventById = new Map(
    (eventsData.data ?? []).map((row) => [row.id as string, row as Record<string, unknown>]),
  );
  const snapshotById = new Map(
    (metricsData.data ?? []).map((row) => [row.id as string, row as Record<string, unknown>]),
  );
  const alertById = new Map(
    (alertsData.data ?? []).map((row) => [row.id as string, row as Record<string, unknown>]),
  );

  const events: ObservationEvidenceEventRef[] = [];
  for (const row of eventLinks.data ?? []) {
    const event = eventById.get(row.event_id as string);
    if (!event) {
      continue;
    }

    events.push({
      event_id: event.id as string,
      relevance: row.relevance as ObservationEvidenceEventRef["relevance"],
      event_type: event.event_type as string,
      category: event.category as string,
      severity: event.severity as NexusSeverity,
      title: event.title as string,
      occurred_at: event.occurred_at as string,
    });
  }

  const metrics: ObservationEvidenceMetricRef[] = [];
  for (const row of metricLinks.data ?? []) {
    const snapshot = snapshotById.get(row.snapshot_id as string);
    if (!snapshot) {
      continue;
    }

    metrics.push({
      snapshot_id: snapshot.id as string,
      role: row.role as ObservationEvidenceMetricRef["role"],
      metric_key: snapshot.metric_key as string,
      value: Number(snapshot.value),
      previous_value:
        snapshot.previous_value === null ? null : Number(snapshot.previous_value),
      period_start: snapshot.period_start as string,
    });
  }

  const alerts: ObservationEvidenceAlertRef[] = [];
  for (const row of alertLinks.data ?? []) {
    const alert = alertById.get(row.alert_id as string);
    if (!alert) {
      continue;
    }

    alerts.push({
      alert_id: alert.id as string,
      relationship: row.relationship as ObservationEvidenceAlertRef["relationship"],
      title: alert.title as string,
      severity: alert.severity as NexusSeverity,
      status: alert.status as string,
      category: alert.category as string,
    });
  }

  return { events, metrics, alerts };
}

export async function getNexusObservationDetail(
  supabase: SupabaseClient,
  observationId: string,
): Promise<NexusObservationDetail | null> {
  const collected_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from("nexus_observations")
    .select(
      "id, observation_type, category, severity, confidence, title, summary, rule_id, status, source, occurred_at, valid_until, incident_id, war_room_id, dismissed_at, dismissed_by, superseded_by, evidence, metadata, created_at, updated_at",
    )
    .eq("id", observationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!row) {
    return null;
  }

  const evidence_links = await loadEvidenceLinks(supabase, observationId);
  const metadata = (row.metadata as Record<string, unknown>) ?? {};
  const summary = mapSummaryFields(
    row as Record<string, unknown>,
    collected_at,
    {
      alerts: evidence_links.alerts.length,
      metrics: evidence_links.metrics.length,
    },
  );

  return {
    ...summary,
    source: row.source as string,
    dismissed_at: (row.dismissed_at as string | null) ?? null,
    dismissed_by: (row.dismissed_by as string | null) ?? null,
    superseded_by: (row.superseded_by as string | null) ?? null,
    war_room_id: (row.war_room_id as string | null) ?? null,
    owner_notes_count: parseOwnerNotes(metadata).length,
    evidence_links,
  };
}
