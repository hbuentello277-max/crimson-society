import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import type { NexusIncidentStatus } from "@/lib/nexus/constants";
import {
  buildImpactSummary,
  buildIncidentSeverity,
  buildIncidentTitle,
  getAlertImpactScore,
} from "@/lib/incidents/escalation";
import type {
  EscalationAlertRow,
  EscalationReason,
  IncidentDbRow,
} from "@/lib/incidents/types";

function maxImpactScore(alerts: EscalationAlertRow[]): number {
  return alerts.reduce((max, alert) => Math.max(max, getAlertImpactScore(alert)), 0);
}

function appendTimeline(
  timeline: Array<Record<string, unknown>>,
  entry: Record<string, unknown>,
): Array<Record<string, unknown>> {
  return [...timeline, entry];
}

export async function linkAlertToIncident(
  admin: SupabaseClient,
  input: {
    alertId: string;
    incidentId: string;
  },
): Promise<boolean> {
  const { error } = await admin
    .from("nexus_alerts")
    .update({
      incident_id: input.incidentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.alertId);

  return !error;
}

export async function createIncidentFromAlerts(
  admin: SupabaseClient,
  input: {
    alerts: EscalationAlertRow[];
    reason: EscalationReason;
    integration_id?: string | null;
    correlation_id?: string;
  },
): Promise<{ incident: IncidentDbRow; eventEmitted: boolean } | null> {
  if (input.alerts.length === 0) {
    return null;
  }

  const now = new Date().toISOString();
  const primary = input.alerts[0];
  const correlationId = input.correlation_id ?? randomUUID();
  const impactScore = maxImpactScore(input.alerts);
  const severity = buildIncidentSeverity(input.alerts);
  const title = buildIncidentTitle({
    reason: input.reason,
    primary_alert: primary,
    alert_count: input.alerts.length,
  });

  const metadata = safeProbeDetails({
    impact_score: impactScore,
    escalation_reason: input.reason,
    correlation_id: correlationId,
    linked_alert_ids: input.alerts.map((alert) => alert.id),
    owner_notes: [],
    suggest_resolve: false,
  });

  const timeline = [
    {
      at: now,
      type: "created",
      reason: input.reason,
      alert_ids: input.alerts.map((alert) => alert.id),
    },
  ];

  const { data, error } = await admin
    .from("nexus_incidents")
    .insert({
      title,
      status: "open",
      severity,
      integration_id: input.integration_id ?? null,
      started_at: now,
      impact_summary: buildImpactSummary(input.reason),
      timeline,
      metadata,
    })
    .select(
      "id, title, status, severity, integration_id, started_at, resolved_at, root_cause, impact_summary, timeline, metadata, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create incident");
  }

  const incident = data as IncidentDbRow;

  for (const alert of input.alerts) {
    await linkAlertToIncident(admin, {
      alertId: alert.id,
      incidentId: incident.id,
    });
  }

  const event = await emitNexusEvent({
    source: "collector",
    category: mapIncidentCategory(primary.category),
    eventType: "incident.created",
    severity: severity === "critical" ? "critical" : "warning",
    title,
    description: buildImpactSummary(input.reason),
    correlationId,
    payload: {
      incident_id: incident.id,
      escalation_reason: input.reason,
      impact_score: impactScore,
      alert_ids: input.alerts.map((alert) => alert.id),
      correlation_id: correlationId,
    },
    metadata: {
      linked_alert_count: input.alerts.length,
    },
  });

  await logNexusActivity({
    actorType: "collector",
    action: "nexus.incident.created",
    targetType: "nexus_incident",
    targetId: incident.id,
    details: {
      escalation_reason: input.reason,
      alert_ids: input.alerts.map((alert) => alert.id),
      impact_score: impactScore,
    },
  });

  return {
    incident,
    eventEmitted: event.ok,
  };
}

export async function updateIncidentImpactFromAlerts(
  admin: SupabaseClient,
  input: {
    incident: IncidentDbRow;
    alerts: EscalationAlertRow[];
  },
): Promise<{ updated: boolean; eventEmitted: boolean }> {
  const newScore = maxImpactScore(input.alerts);
  const currentScore =
    typeof input.incident.metadata?.impact_score === "number"
      ? input.incident.metadata.impact_score
      : 0;

  if (newScore <= currentScore) {
    return { updated: false, eventEmitted: false };
  }

  const now = new Date().toISOString();
  const metadata: Record<string, unknown> = {
    ...input.incident.metadata,
    impact_score: newScore,
  };

  const timeline = appendTimeline(input.incident.timeline ?? [], {
    at: now,
    type: "impact_updated",
    impact_score: newScore,
  });

  const { error } = await admin
    .from("nexus_incidents")
    .update({
      metadata: safeProbeDetails(metadata),
      timeline,
      updated_at: now,
    })
    .eq("id", input.incident.id);

  if (error) {
    return { updated: false, eventEmitted: false };
  }

  const event = await emitNexusEvent({
    source: "collector",
    category: "infra",
    eventType: "incident.updated",
    severity: input.incident.severity === "critical" ? "critical" : "warning",
    title: input.incident.title,
    description: `Incident impact score updated to ${newScore}`,
    correlationId:
      typeof metadata.correlation_id === "string" ? (metadata.correlation_id as string) : null,
    payload: {
      incident_id: input.incident.id,
      impact_score: newScore,
      previous_impact_score: currentScore,
    },
  });

  await logNexusActivity({
    actorType: "collector",
    action: "nexus.incident.updated",
    targetType: "nexus_incident",
    targetId: input.incident.id,
    details: { impact_score: newScore, previous_impact_score: currentScore },
  });

  return { updated: true, eventEmitted: event.ok };
}

export async function linkNewAlertToOpenIncident(
  admin: SupabaseClient,
  input: {
    incident: IncidentDbRow;
    alert: EscalationAlertRow;
  },
): Promise<{ linked: boolean; eventEmitted: boolean }> {
  const linked = await linkAlertToIncident(admin, {
    alertId: input.alert.id,
    incidentId: input.incident.id,
  });

  if (!linked) {
    return { linked: false, eventEmitted: false };
  }

  const now = new Date().toISOString();
  const linkedIds = Array.isArray(input.incident.metadata?.linked_alert_ids)
    ? [...(input.incident.metadata.linked_alert_ids as string[])]
    : [];

  if (!linkedIds.includes(input.alert.id)) {
    linkedIds.push(input.alert.id);
  }

  const metadata: Record<string, unknown> = {
    ...input.incident.metadata,
    linked_alert_ids: linkedIds,
  };

  const timeline = appendTimeline(input.incident.timeline ?? [], {
    at: now,
    type: "alert_linked",
    alert_id: input.alert.id,
  });

  await admin
    .from("nexus_incidents")
    .update({
      metadata: safeProbeDetails(metadata),
      timeline,
      updated_at: now,
    })
    .eq("id", input.incident.id);

  const event = await emitNexusEvent({
    source: "collector",
    category: mapIncidentCategory(input.alert.category),
    eventType: "incident.updated",
    severity: input.incident.severity === "critical" ? "critical" : "warning",
    title: input.incident.title,
    description: `Alert linked to incident`,
    correlationId:
      typeof metadata.correlation_id === "string" ? (metadata.correlation_id as string) : null,
    payload: {
      incident_id: input.incident.id,
      alert_id: input.alert.id,
    },
  });

  return { linked: true, eventEmitted: event.ok };
}

export async function suggestIncidentResolve(
  admin: SupabaseClient,
  incidentId: string,
): Promise<boolean> {
  const { data: incident } = await admin
    .from("nexus_incidents")
    .select("id, metadata, status, timeline, title, severity")
    .eq("id", incidentId)
    .maybeSingle();

  if (!incident) {
    return false;
  }

  if (!["open", "investigating", "mitigated"].includes(incident.status as string)) {
    return false;
  }

  const metadata = {
    ...((incident.metadata as Record<string, unknown>) ?? {}),
    suggest_resolve: true,
  };

  const now = new Date().toISOString();
  const timeline = appendTimeline((incident.timeline as Array<Record<string, unknown>>) ?? [], {
    at: now,
    type: "suggest_resolve",
    reason: "all_linked_alerts_resolved",
  });

  const { error } = await admin
    .from("nexus_incidents")
    .update({
      metadata: safeProbeDetails(metadata),
      timeline,
      updated_at: now,
    })
    .eq("id", incidentId);

  return !error;
}

export async function updateOwnerIncidentStatus(
  supabase: SupabaseClient,
  input: {
    incidentId: string;
    ownerId: string;
    status?: NexusIncidentStatus;
    root_cause?: string;
    impact_summary?: string;
  },
): Promise<{ ok: true; incidentId: string; eventEmitted: boolean } | { ok: false; error: string }> {
  const { data: existing, error: readError } = await supabase
    .from("nexus_incidents")
    .select("id, title, status, severity, metadata, timeline")
    .eq("id", input.incidentId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!existing) {
    return { ok: false, error: "Incident not found" };
  }

  const now = new Date().toISOString();
  const metadata = {
    ...((existing.metadata as Record<string, unknown>) ?? {}),
  };

  const updatePayload: Record<string, unknown> = {
    updated_at: now,
  };

  if (input.root_cause !== undefined) {
    updatePayload.root_cause = input.root_cause.trim() || null;
  }

  if (input.impact_summary !== undefined) {
    updatePayload.impact_summary = input.impact_summary.trim() || null;
  }

  if (input.status) {
    updatePayload.status = input.status;
    if (input.status === "resolved" || input.status === "postmortem") {
      updatePayload.resolved_at = now;
      metadata.suggest_resolve = false;
    }
    if (input.status === "investigating" && existing.status === "open") {
      metadata.investigating_since = now;
    }
  }

  updatePayload.metadata = safeProbeDetails(metadata);

  const timeline = appendTimeline((existing.timeline as Array<Record<string, unknown>>) ?? [], {
    at: now,
    type: "status_changed",
    status: input.status ?? existing.status,
    owner_id: input.ownerId,
  });
  updatePayload.timeline = timeline;

  const { error: updateError } = await supabase
    .from("nexus_incidents")
    .update(updatePayload)
    .eq("id", input.incidentId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  let eventType = "incident.updated";
  if (input.status === "resolved") {
    eventType = "incident.resolved";
  }

  const event = await emitNexusEvent({
    source: "manual",
    category: "infra",
    eventType,
    severity: existing.severity === "critical" ? "critical" : "warning",
    title: existing.title as string,
    description: input.impact_summary ?? `Incident status updated to ${input.status ?? existing.status}`,
    correlationId:
      typeof metadata.correlation_id === "string" ? metadata.correlation_id : null,
    payload: {
      incident_id: input.incidentId,
      status: input.status ?? existing.status,
      owner_id: input.ownerId,
    },
  });

  await logNexusActivity({
    actorId: input.ownerId,
    actorType: "owner",
    action: `nexus.${eventType}`,
    targetType: "nexus_incident",
    targetId: input.incidentId,
    details: {
      status: input.status ?? null,
      root_cause: input.root_cause ?? null,
    },
  });

  return { ok: true, incidentId: input.incidentId, eventEmitted: event.ok };
}

function mapIncidentCategory(
  category: string,
): "health" | "deployment" | "revenue" | "growth" | "security" | "commerce" | "infra" | "mission" | "recovery" {
  if (
    category === "health" ||
    category === "deployment" ||
    category === "revenue" ||
    category === "growth" ||
    category === "security" ||
    category === "commerce" ||
    category === "infra" ||
    category === "mission" ||
    category === "recovery"
  ) {
    return category;
  }

  return "infra";
}
