import type { SupabaseClient } from "@supabase/supabase-js";
import { getMissionHealthSnapshot } from "@/lib/mission-health/summary";
import { getNexusHealthSnapshot } from "@/lib/monitoring/health-summary";
import { integrationDisplayName } from "@/lib/nexus/format";
import type {
  NexusWarRoomDetail,
  WarRoomDbRow,
  WarRoomEventRow,
  WarRoomInfrastructureSnapshot,
  WarRoomWorkflowSnapshot,
} from "@/lib/war-room/types";
import type { NexusIncidentStatus, NexusWarRoomStatus } from "@/lib/nexus/constants";

function mapWarRoomRow(row: Record<string, unknown>): WarRoomDbRow {
  return {
    id: row.id as string,
    incident_id: row.incident_id as string,
    title: row.title as string,
    status: row.status as NexusWarRoomStatus,
    severity: row.severity as WarRoomDbRow["severity"],
    impact_summary: (row.impact_summary as string | null) ?? null,
    root_cause: (row.root_cause as string | null) ?? null,
    resolution_summary: (row.resolution_summary as string | null) ?? null,
    owner_notes: (row.owner_notes as string | null) ?? null,
    timeline: (row.timeline as Array<Record<string, unknown>>) ?? [],
    recommended_actions: (row.recommended_actions as Array<Record<string, unknown>>) ?? [],
    activated_at: row.activated_at as string,
    stabilized_at: (row.stabilized_at as string | null) ?? null,
    resolved_at: (row.resolved_at as string | null) ?? null,
    archived_at: (row.archived_at as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function readSnapshot<T>(metadata: Record<string, unknown>, key: string): T | null {
  const value = metadata[key];
  return value && typeof value === "object" ? (value as T) : null;
}

async function loadRelatedEvents(
  supabase: SupabaseClient,
  incidentId: string,
  warRoomId: string,
  since: string,
): Promise<WarRoomEventRow[]> {
  const { data, error } = await supabase
    .from("nexus_events")
    .select("id, source, category, event_type, severity, title, description, occurred_at, payload")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => {
      const payload = (row.payload as Record<string, unknown> | null) ?? {};
      return (
        payload.incident_id === incidentId ||
        payload.war_room_id === warRoomId ||
        (row.event_type as string).includes("incident") ||
        (row.event_type as string).includes("war_room")
      );
    })
    .map((row) => ({
      id: row.id as string,
      source: row.source as string,
      category: row.category as string,
      event_type: row.event_type as string,
      severity: row.severity as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      occurred_at: row.occurred_at as string,
    }));
}

function mergeTimeline(
  warRoomTimeline: Array<Record<string, unknown>>,
  incidentTimeline: Array<Record<string, unknown>>,
  events: WarRoomEventRow[],
): Array<Record<string, unknown>> {
  const eventEntries = events.map((event) => ({
    at: event.occurred_at,
    type: event.event_type,
    message: event.title,
    severity: event.severity,
    source: "nexus_event",
    event_id: event.id,
  }));

  return [...warRoomTimeline, ...incidentTimeline, ...eventEntries].sort((a, b) => {
    const aTime = String((a as Record<string, unknown>).at ?? (a as Record<string, unknown>).occurred_at ?? "");
    const bTime = String((b as Record<string, unknown>).at ?? (b as Record<string, unknown>).occurred_at ?? "");
    return bTime.localeCompare(aTime);
  });
}

export async function getNexusWarRoomDetail(
  supabase: SupabaseClient,
  warRoomId: string,
): Promise<NexusWarRoomDetail | null> {
  const { data: warRoomRow, error: warRoomError } = await supabase
    .from("nexus_war_rooms")
    .select("*")
    .eq("id", warRoomId)
    .maybeSingle();

  if (warRoomError) {
    throw new Error(warRoomError.message);
  }

  if (!warRoomRow) {
    return null;
  }

  const warRoom = mapWarRoomRow(warRoomRow as Record<string, unknown>);
  const incidentId = warRoom.incident_id;

  const [
    incidentResult,
    alertsResult,
    observationsResult,
    healthSnapshot,
    workflowSnapshot,
  ] = await Promise.all([
    supabase
      .from("nexus_incidents")
      .select(
        "id, title, status, severity, started_at, resolved_at, root_cause, impact_summary, timeline, metadata",
      )
      .eq("id", incidentId)
      .maybeSingle(),
    supabase
      .from("nexus_alerts")
      .select("id, title, severity, status, category, updated_at")
      .eq("incident_id", incidentId)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("nexus_observations")
      .select("id, title, summary, severity, status, confidence, occurred_at")
      .or(`incident_id.eq.${incidentId},war_room_id.eq.${warRoomId}`)
      .order("occurred_at", { ascending: false })
      .limit(50),
    getNexusHealthSnapshot(supabase),
    getMissionHealthSnapshot(supabase),
  ]);

  if (incidentResult.error) {
    throw new Error(incidentResult.error.message);
  }

  if (!incidentResult.data) {
    return null;
  }

  if (alertsResult.error) {
    throw new Error(alertsResult.error.message);
  }

  if (observationsResult.error) {
    throw new Error(observationsResult.error.message);
  }

  const metadata = warRoom.metadata;
  const infrastructure_snapshot = readSnapshot<WarRoomInfrastructureSnapshot>(
    metadata,
    "infrastructure_snapshot",
  );
  const workflow_snapshot = readSnapshot<WarRoomWorkflowSnapshot>(metadata, "workflow_snapshot");

  const current_infrastructure: WarRoomInfrastructureSnapshot = {
    captured_at: healthSnapshot.checkedAt ?? new Date().toISOString(),
    system_status: healthSnapshot.systemStatus,
    integrations: healthSnapshot.integrations.map((item) => ({
      slug: item.slug,
      display_name: integrationDisplayName(item.slug),
      status: item.status,
      latency_ms: item.latency_ms,
    })),
  };

  const current_workflows: WarRoomWorkflowSnapshot = {
    captured_at: workflowSnapshot.checked_at ?? new Date().toISOString(),
    score: workflowSnapshot.score,
    status: workflowSnapshot.status,
    workflows: workflowSnapshot.workflows.map((workflow) => ({
      slug: workflow.slug,
      display_name: workflow.display_name,
      workflow_status: workflow.workflow_status,
      workflow_score: workflow.workflow_score,
    })),
  };

  const events = await loadRelatedEvents(
    supabase,
    incidentId,
    warRoomId,
    warRoom.activated_at,
  );

  const incident = incidentResult.data;

  return {
    collected_at: new Date().toISOString(),
    war_room: warRoom,
    incident: {
      id: incident.id as string,
      title: incident.title as string,
      status: incident.status as NexusIncidentStatus,
      severity: incident.severity as NexusWarRoomDetail["incident"]["severity"],
      started_at: incident.started_at as string,
      resolved_at: (incident.resolved_at as string | null) ?? null,
      root_cause: (incident.root_cause as string | null) ?? null,
      impact_summary: (incident.impact_summary as string | null) ?? null,
      timeline: (incident.timeline as Array<Record<string, unknown>>) ?? [],
      metadata: (incident.metadata as Record<string, unknown>) ?? {},
    },
    linked_alerts: (alertsResult.data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      severity: row.severity as string,
      status: row.status as string,
      category: row.category as string,
      updated_at: row.updated_at as string,
    })),
    linked_observations: (observationsResult.data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      summary: row.summary as string,
      severity: row.severity as string,
      status: row.status as string,
      confidence: Number(row.confidence),
      occurred_at: row.occurred_at as string,
    })),
    infrastructure_snapshot,
    workflow_snapshot,
    current_infrastructure,
    current_workflows,
    events,
    timeline: mergeTimeline(
      warRoom.timeline,
      (incident.timeline as Array<Record<string, unknown>>) ?? [],
      events,
    ),
  };
}
