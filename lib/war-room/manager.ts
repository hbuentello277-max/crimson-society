import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNexusEvent } from "@/lib/events/emit";
import { getMissionHealthSnapshot } from "@/lib/mission-health/summary";
import { getNexusHealthSnapshot } from "@/lib/monitoring/health-summary";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import { integrationDisplayName } from "@/lib/nexus/format";
import { createNexusServiceClient } from "@/lib/nexus/client";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import type { NexusWarRoomStatus } from "@/lib/nexus/constants";
import type {
  CreateWarRoomResult,
  UpdateWarRoomResult,
  WarRoomDbRow,
  WarRoomInfrastructureSnapshot,
  WarRoomWorkflowSnapshot,
} from "@/lib/war-room/types";

function appendTimeline(
  timeline: Array<Record<string, unknown>>,
  entry: Record<string, unknown>,
): Array<Record<string, unknown>> {
  return [...timeline, { ...entry, at: new Date().toISOString() }];
}

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

async function captureInfrastructureSnapshot(
  supabase: SupabaseClient,
): Promise<WarRoomInfrastructureSnapshot> {
  const snapshot = await getNexusHealthSnapshot(supabase);
  return {
    captured_at: snapshot.checkedAt ?? new Date().toISOString(),
    system_status: snapshot.systemStatus,
    integrations: snapshot.integrations.map((item) => ({
      slug: item.slug,
      display_name: integrationDisplayName(item.slug),
      status: item.status,
      latency_ms: item.latency_ms,
    })),
  };
}

async function captureWorkflowSnapshot(
  supabase: SupabaseClient,
): Promise<WarRoomWorkflowSnapshot> {
  const snapshot = await getMissionHealthSnapshot(supabase);
  return {
    captured_at: snapshot.checked_at ?? new Date().toISOString(),
    score: snapshot.score,
    status: snapshot.status,
    workflows: snapshot.workflows.map((workflow) => ({
      slug: workflow.slug,
      display_name: workflow.display_name,
      workflow_status: workflow.workflow_status,
      workflow_score: workflow.workflow_score,
    })),
  };
}

export async function createWarRoomFromIncident(input: {
  ownerId: string;
  incidentId: string;
  title?: string;
  ownerSupabase: SupabaseClient;
}): Promise<CreateWarRoomResult> {
  const admin = createNexusServiceClient();

  const { data: incident, error: incidentError } = await input.ownerSupabase
    .from("nexus_incidents")
    .select(
      "id, title, status, severity, impact_summary, root_cause, metadata, started_at",
    )
    .eq("id", input.incidentId)
    .maybeSingle();

  if (incidentError) {
    return { ok: false, error: incidentError.message };
  }

  if (!incident) {
    return { ok: false, error: "Incident not found", code: "not_found" };
  }

  const { data: existing, error: existingError } = await input.ownerSupabase
    .from("nexus_war_rooms")
    .select("id, status")
    .eq("incident_id", input.incidentId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  if (existing) {
    return {
      ok: false,
      error: "A war room already exists for this incident",
      code: "duplicate",
    };
  }

  const [infrastructureSnapshot, workflowSnapshot] = await Promise.all([
    captureInfrastructureSnapshot(input.ownerSupabase),
    captureWorkflowSnapshot(input.ownerSupabase),
  ]);

  const now = new Date().toISOString();
  const title = input.title?.trim() || `War Room: ${incident.title as string}`;
  const metadata = safeProbeDetails({
    created_by: input.ownerId,
    infrastructure_snapshot: infrastructureSnapshot,
    workflow_snapshot: workflowSnapshot,
    incident_status_at_open: incident.status,
  });

  const timeline = [
    {
      at: now,
      type: "war_room.opened",
      message: "War room opened from incident",
      actor_id: input.ownerId,
      incident_id: input.incidentId,
    },
  ];

  const { data: created, error: insertError } = await admin
    .from("nexus_war_rooms")
    .insert({
      incident_id: input.incidentId,
      title,
      status: "open",
      severity: incident.severity,
      impact_summary: (incident.impact_summary as string | null) ?? null,
      root_cause: (incident.root_cause as string | null) ?? null,
      owner_notes: null,
      timeline,
      metadata,
      activated_at: now,
    })
    .select("*")
    .single();

  if (insertError || !created) {
    return { ok: false, error: insertError?.message ?? "Failed to create war room" };
  }

  const warRoomId = created.id as string;

  await admin
    .from("nexus_observations")
    .update({ war_room_id: warRoomId, updated_at: now })
    .eq("incident_id", input.incidentId)
    .is("war_room_id", null);

  await emitNexusEvent({
    source: "manual",
    category: "infra",
    eventType: "war_room.created",
    severity: incident.severity === "critical" ? "critical" : "warning",
    title: title,
    description: `War room opened for incident ${incident.title as string}`,
    payload: {
      war_room_id: warRoomId,
      incident_id: input.incidentId,
      owner_id: input.ownerId,
    },
  });

  await logNexusActivity({
    actorId: input.ownerId,
    actorType: "owner",
    action: "nexus.war_room.created",
    targetType: "nexus_war_room",
    targetId: warRoomId,
    details: { incident_id: input.incidentId },
  });

  return { ok: true, war_room: mapWarRoomRow(created as Record<string, unknown>), created: true };
}

export async function updateOwnerWarRoom(
  supabase: SupabaseClient,
  input: {
    warRoomId: string;
    ownerId: string;
    status?: NexusWarRoomStatus;
    owner_notes?: string;
    root_cause?: string;
    impact_summary?: string;
    resolution_summary?: string;
  },
): Promise<UpdateWarRoomResult> {
  const { data: existing, error: readError } = await supabase
    .from("nexus_war_rooms")
    .select("*")
    .eq("id", input.warRoomId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!existing) {
    return { ok: false, error: "War room not found" };
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };
  let timeline = (existing.timeline as Array<Record<string, unknown>>) ?? [];

  if (input.owner_notes !== undefined) {
    updates.owner_notes = input.owner_notes;
    timeline = appendTimeline(timeline, {
      type: "war_room.notes_updated",
      actor_id: input.ownerId,
    });
  }

  if (input.root_cause !== undefined) {
    updates.root_cause = input.root_cause;
    timeline = appendTimeline(timeline, {
      type: "war_room.root_cause_updated",
      actor_id: input.ownerId,
    });
  }

  if (input.impact_summary !== undefined) {
    updates.impact_summary = input.impact_summary;
    timeline = appendTimeline(timeline, {
      type: "war_room.impact_updated",
      actor_id: input.ownerId,
    });
  }

  if (input.resolution_summary !== undefined) {
    updates.resolution_summary = input.resolution_summary;
    timeline = appendTimeline(timeline, {
      type: "war_room.resolution_updated",
      actor_id: input.ownerId,
    });
  }

  if (input.status) {
    updates.status = input.status;
    timeline = appendTimeline(timeline, {
      type: "war_room.status_changed",
      actor_id: input.ownerId,
      status: input.status,
    });

    if (input.status === "active" && !existing.stabilized_at) {
      updates.stabilized_at = now;
    }
    if (input.status === "resolved") {
      updates.resolved_at = now;
    }
    if (input.status === "archived") {
      updates.archived_at = now;
    }
  }

  updates.timeline = timeline;

  const { error: updateError } = await supabase
    .from("nexus_war_rooms")
    .update(updates)
    .eq("id", input.warRoomId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  let eventEmitted = false;
  if (input.status) {
    const event = await emitNexusEvent({
      source: "manual",
      category: "infra",
      eventType: `war_room.${input.status}`,
      severity: input.status === "resolved" ? "info" : "warning",
      title: `War room ${input.status}`,
      description: existing.title as string,
      payload: {
        war_room_id: input.warRoomId,
        incident_id: existing.incident_id,
        owner_id: input.ownerId,
        status: input.status,
      },
    });
    eventEmitted = event.ok;

    await logNexusActivity({
      actorId: input.ownerId,
      actorType: "owner",
      action: `nexus.war_room.${input.status}`,
      targetType: "nexus_war_room",
      targetId: input.warRoomId,
      details: { incident_id: existing.incident_id },
    });
  }

  return { ok: true, war_room_id: input.warRoomId, event_emitted: eventEmitted };
}
