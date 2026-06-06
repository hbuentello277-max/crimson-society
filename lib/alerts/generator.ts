import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import type {
  AlertCandidate,
  AlertDbStatus,
  RecoveryCandidate,
} from "@/lib/alerts/types";

type AlertRow = {
  id: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** Open triage alerts (active or owner-acknowledged) for dedupe upserts. */
export async function findOpenAlertByDedupeKey(
  admin: SupabaseClient,
  dedupeKey: string,
): Promise<AlertRow | null> {
  const { data, error } = await admin
    .from("nexus_alerts")
    .select("id, status, metadata, created_at")
    .eq("dedupe_key", dedupeKey)
    .in("status", ["active", "acknowledged"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AlertRow;
}

export async function upsertFiringAlert(
  admin: SupabaseClient,
  candidate: AlertCandidate,
): Promise<{ action: "created" | "updated"; alertId: string; eventEmitted: boolean }> {
  const now = new Date().toISOString();
  const existing = await findOpenAlertByDedupeKey(admin, candidate.dedupe_key);

  if (existing) {
    const firstSeen =
      typeof existing.metadata?.first_seen_at === "string"
        ? existing.metadata.first_seen_at
        : existing.created_at;

    const metadata = {
      ...((existing.metadata as Record<string, unknown>) ?? {}),
      evidence: candidate.evidence,
      impact_score: Math.max(
        Number(existing.metadata?.impact_score ?? 0),
        candidate.impact_score,
      ),
      last_seen_at: now,
      first_seen_at: firstSeen,
      investigating: existing.metadata?.investigating ?? false,
      owner_notes: existing.metadata?.owner_notes ?? [],
    };

    const { error } = await admin
      .from("nexus_alerts")
      .update({
        severity: candidate.severity,
        message: candidate.message,
        metadata: safeProbeDetails(metadata),
        updated_at: now,
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    const event = await emitNexusEvent({
      source: "collector",
      category: mapCategoryToEventCategory(candidate.category),
      eventType: "alert.updated",
      severity: candidate.severity === "critical" ? "critical" : candidate.severity === "warning" ? "warning" : "info",
      title: candidate.title,
      description: candidate.message,
      payload: {
        alert_id: existing.id,
        rule_id: candidate.rule.rule_id,
        dedupe_key: candidate.dedupe_key,
        impact_score: metadata.impact_score,
      },
      metadata: candidate.evidence,
    });

    return {
      action: "updated",
      alertId: existing.id,
      eventEmitted: event.ok,
    };
  }

  const metadata = safeProbeDetails({
    evidence: candidate.evidence,
    impact_score: candidate.impact_score,
    first_seen_at: now,
    last_seen_at: now,
    investigating: false,
    owner_notes: [],
  });

  const { data, error } = await admin
    .from("nexus_alerts")
    .insert({
      event_id: candidate.event_id ?? null,
      category: candidate.category,
      severity: candidate.severity,
      title: candidate.title,
      message: candidate.message,
      status: "active",
      rule_id: candidate.rule.rule_id,
      dedupe_key: candidate.dedupe_key,
      metadata,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const alertId = data.id as string;
  const event = await emitNexusEvent({
    source: "collector",
    category: mapCategoryToEventCategory(candidate.category),
    eventType: "alert.created",
    severity: candidate.severity === "critical" ? "critical" : candidate.severity === "warning" ? "warning" : "info",
    title: candidate.title,
    description: candidate.message,
    payload: {
      alert_id: alertId,
      rule_id: candidate.rule.rule_id,
      dedupe_key: candidate.dedupe_key,
      impact_score: candidate.impact_score,
    },
    metadata: candidate.evidence,
  });

  return {
    action: "created",
    alertId,
    eventEmitted: event.ok,
  };
}

export async function resolveAlertById(
  admin: SupabaseClient,
  alertId: string,
  reason: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from("nexus_alerts")
    .select("metadata")
    .eq("id", alertId)
    .maybeSingle();

  const metadata = {
    ...((existing?.metadata as Record<string, unknown>) ?? {}),
    resolved_reason: reason,
    resolved_at_system: now,
  };

  const { error } = await admin
    .from("nexus_alerts")
    .update({
      status: "resolved",
      resolved_at: now,
      metadata: safeProbeDetails(metadata),
    })
    .eq("id", alertId)
    .in("status", ["active", "acknowledged"]);

  return !error;
}

export async function processRecovery(
  admin: SupabaseClient,
  recovery: RecoveryCandidate,
): Promise<{ resolved: boolean; noticeCreated: boolean; eventEmitted: boolean }> {
  let resolved = false;
  if (recovery.original_alert_id) {
    resolved = await resolveAlertById(admin, recovery.original_alert_id, "auto_recovery");
  }

  const event = await emitNexusEvent({
    source: "collector",
    category: "recovery",
    eventType: "alert.recovered",
    severity: "info",
    title: recovery.title,
    description: recovery.message,
    payload: {
      paired_rule_id: recovery.paired_rule_id,
      scope: recovery.scope,
      scope_id: recovery.scope_id,
      previous_status: recovery.previous_status,
      current_status: recovery.current_status,
      duration_minutes: recovery.duration_minutes,
      original_alert_id: recovery.original_alert_id,
      dedupe_key: recovery.dedupe_key,
    },
    metadata: recovery.evidence,
  });

  const existingNotice = await findOpenAlertByDedupeKey(admin, recovery.recovery_dedupe_key);
  let noticeCreated = false;

  if (!existingNotice) {
    const now = new Date().toISOString();
    const { error } = await admin.from("nexus_alerts").insert({
      category: "recovery",
      severity: "info",
      title: recovery.title,
      message: recovery.message,
      status: "resolved",
      rule_id: `recovery.${recovery.scope}.${recovery.scope_id}`,
      dedupe_key: recovery.recovery_dedupe_key,
      resolved_at: now,
      metadata: safeProbeDetails({
        impact_score: 8,
        recovery_of_alert_id: recovery.original_alert_id,
        duration_minutes: recovery.duration_minutes,
        evidence: recovery.evidence,
        owner_notes: [],
      }),
    });

    noticeCreated = !error;
  }

  return {
    resolved,
    noticeCreated,
    eventEmitted: event.ok,
  };
}

export async function emitRuleSkippedEvent(
  admin: SupabaseClient,
  ruleId: string,
  reason: string,
): Promise<boolean> {
  const event = await emitNexusEvent({
    source: "collector",
    category: "infra",
    eventType: "alert.rule.skipped",
    severity: "warning",
    title: `Alert rule skipped: ${ruleId}`,
    description: reason,
    payload: {
      rule_id: ruleId,
      reason,
    },
  });

  await logNexusActivity({
    actorType: "collector",
    action: "nexus.alert.rule_skipped",
    targetType: "nexus_alert_rule",
    details: { rule_id: ruleId, reason },
  });

  return event.ok;
}

function mapCategoryToEventCategory(
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

export async function updateOwnerAlertStatus(
  supabase: SupabaseClient,
  input: {
    alertId: string;
    ownerId: string;
    status?: AlertDbStatus;
    investigating?: boolean;
  },
): Promise<{ ok: true; alertId: string; eventEmitted: boolean } | { ok: false; error: string }> {
  const { data: existing, error: readError } = await supabase
    .from("nexus_alerts")
    .select("id, status, title, message, metadata, rule_id, category, severity")
    .eq("id", input.alertId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!existing) {
    return { ok: false, error: "Alert not found" };
  }

  const now = new Date().toISOString();
  const metadata = {
    ...((existing.metadata as Record<string, unknown>) ?? {}),
  };

  const updatePayload: Record<string, unknown> = {
    updated_at: now,
    metadata: safeProbeDetails(metadata),
  };

  if (input.investigating !== undefined) {
    metadata.investigating = input.investigating;
    updatePayload.metadata = safeProbeDetails(metadata);
    if (input.investigating && existing.status === "active") {
      updatePayload.status = "acknowledged";
      updatePayload.acknowledged_at = now;
      updatePayload.acknowledged_by = input.ownerId;
    }
  }

  if (input.status) {
    updatePayload.status = input.status;
    if (input.status === "acknowledged") {
      updatePayload.acknowledged_at = now;
      updatePayload.acknowledged_by = input.ownerId;
    }
    if (input.status === "resolved" || input.status === "suppressed") {
      updatePayload.resolved_at = now;
      updatePayload.resolved_by = input.ownerId;
    }
  }

  const { error: updateError } = await supabase
    .from("nexus_alerts")
    .update(updatePayload)
    .eq("id", input.alertId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  let eventType = "alert.updated";
  if (input.status === "acknowledged") {
    eventType = "alert.acknowledged";
  } else if (input.status === "resolved") {
    eventType = "alert.resolved";
  } else if (input.status === "suppressed") {
    eventType = "alert.suppressed";
  } else if (input.investigating) {
    eventType = "alert.investigating";
  }

  const event = await emitNexusEvent({
    source: "manual",
    category: mapCategoryToEventCategory(existing.category as string),
    eventType,
    severity: existing.severity === "critical" ? "critical" : existing.severity === "warning" ? "warning" : "info",
    title: existing.title as string,
    description: existing.message as string,
    payload: {
      alert_id: input.alertId,
      rule_id: existing.rule_id,
      status: input.status ?? existing.status,
      investigating: metadata.investigating ?? false,
      owner_id: input.ownerId,
    },
  });

  await logNexusActivity({
    actorId: input.ownerId,
    actorType: "owner",
    action: `nexus.alert.${eventType}`,
    targetType: "nexus_alert",
    targetId: input.alertId,
    details: {
      status: input.status ?? null,
      investigating: input.investigating ?? null,
    },
  });

  return { ok: true, alertId: input.alertId, eventEmitted: event.ok };
}
