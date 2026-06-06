import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import { computeObservationConfidence } from "@/lib/observations/confidence";
import { buildObservationDedupeKey } from "@/lib/observations/deduplication";
import { buildPriorityMetadata } from "@/lib/observations/priority";
import { selectObservationSeverity } from "@/lib/observations/severity";
import type { ObservationCandidate, ObservationMatch } from "@/lib/observations/types";

type ActiveObservationRow = {
  id: string;
  metadata: Record<string, unknown>;
};

export async function findActiveObservationByDedupeKey(
  admin: SupabaseClient,
  dedupeKey: string,
): Promise<ActiveObservationRow | null> {
  const { data, error } = await admin
    .from("nexus_observations")
    .select("id, metadata")
    .eq("status", "active")
    .eq("metadata->>dedupe_key", dedupeKey)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ActiveObservationRow;
}

export function buildObservationCandidate(
  match: ObservationMatch,
  evaluatedAt: string,
): ObservationCandidate {
  const dedupe_key = buildObservationDedupeKey({
    rule_id: match.rule.rule_id,
    scope: match.scope,
    scope_id: match.scope_id,
  });

  const confidence = computeObservationConfidence(match.confidence_inputs);
  const severity = selectObservationSeverity(match.severity_inputs);

  return {
    rule: match.rule,
    dedupe_key,
    scope: match.scope,
    scope_id: match.scope_id,
    observation_type: match.observation_type,
    category: match.category,
    severity,
    confidence,
    title: match.title,
    summary: match.summary,
    evidence: match.evidence,
    valid_until: match.valid_until,
    occurred_at: evaluatedAt,
    metric_refs: match.metric_refs,
    event_refs: match.event_refs,
    alert_refs: match.alert_refs,
    incident_id: match.incident_id ?? null,
  };
}

async function linkObservationJunctions(
  admin: SupabaseClient,
  observationId: string,
  candidate: ObservationCandidate,
): Promise<void> {
  if (candidate.metric_refs.length > 0) {
    const { error } = await admin.from("nexus_observation_metrics").upsert(
      candidate.metric_refs.map((ref) => ({
        observation_id: observationId,
        snapshot_id: ref.snapshot_id,
        role: ref.role,
      })),
      { onConflict: "observation_id,snapshot_id" },
    );

    if (error) {
      console.warn("[nexus-observations] metric junction insert failed", error.message);
    }
  }

  if (candidate.event_refs.length > 0) {
    const { error } = await admin.from("nexus_observation_events").upsert(
      candidate.event_refs.map((ref) => ({
        observation_id: observationId,
        event_id: ref.event_id,
        relevance: ref.relevance,
      })),
      { onConflict: "observation_id,event_id" },
    );

    if (error) {
      console.warn("[nexus-observations] event junction insert failed", error.message);
    }
  }

  if (candidate.alert_refs.length > 0) {
    const { error } = await admin.from("nexus_observation_alerts").upsert(
      candidate.alert_refs.map((ref) => ({
        observation_id: observationId,
        alert_id: ref.alert_id,
        relationship: ref.relationship,
      })),
      { onConflict: "observation_id,alert_id" },
    );

    if (error) {
      console.warn("[nexus-observations] alert junction insert failed", error.message);
    }
  }
}

export async function supersedeObservation(
  admin: SupabaseClient,
  input: {
    previousId: string;
    supersededById: string;
    dedupeKey: string;
    ruleId: string;
  },
): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("nexus_observations")
    .update({
      status: "superseded",
      superseded_by: input.supersededById,
      updated_at: now,
    })
    .eq("id", input.previousId)
    .eq("status", "active");

  if (error) {
    console.warn("[nexus-observations] supersede failed", error.message);
    return false;
  }

  const event = await emitNexusEvent({
    source: "collector",
    category: "infra",
    eventType: "observation.superseded",
    severity: "info",
    title: "Observation superseded",
    description: `Observation ${input.previousId} superseded by ${input.supersededById}`,
    payload: {
      previous_observation_id: input.previousId,
      new_observation_id: input.supersededById,
      dedupe_key: input.dedupeKey,
      rule_id: input.ruleId,
    },
  });

  return event.ok;
}

export async function createObservation(
  admin: SupabaseClient,
  candidate: ObservationCandidate,
): Promise<{ observationId: string; eventEmitted: boolean; supersededPreviousId: string | null }> {
  const existing = await findActiveObservationByDedupeKey(admin, candidate.dedupe_key);
  const priority = buildPriorityMetadata({
    confidence: candidate.confidence,
    severity: candidate.severity,
    occurredAt: candidate.occurred_at,
  });
  const metadata = safeProbeDetails({
    dedupe_key: candidate.dedupe_key,
    scope: candidate.scope,
    scope_id: candidate.scope_id,
    evidence: candidate.evidence,
    engine_version: "8c",
    priority_score: priority.priority_score,
    priority_tier: priority.priority_tier,
  });

  const { data, error } = await admin
    .from("nexus_observations")
    .insert({
      observation_type: candidate.observation_type,
      category: candidate.category,
      severity: candidate.severity,
      confidence: candidate.confidence,
      title: candidate.title,
      summary: candidate.summary,
      evidence: candidate.evidence,
      source: "rule_engine",
      rule_id: candidate.rule.rule_id,
      status: "active",
      incident_id: candidate.incident_id ?? null,
      occurred_at: candidate.occurred_at,
      valid_until: candidate.valid_until,
      metadata,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const observationId = data.id as string;

  await linkObservationJunctions(admin, observationId, candidate);

  if (existing) {
    await supersedeObservation(admin, {
      previousId: existing.id,
      supersededById: observationId,
      dedupeKey: candidate.dedupe_key,
      ruleId: candidate.rule.rule_id,
    });
  }

  const event = await emitNexusEvent({
    source: "collector",
    category: mapCategoryToEventCategory(candidate.category),
    eventType: "observation.created",
    severity:
      candidate.severity === "critical"
        ? "critical"
        : candidate.severity === "warning"
          ? "warning"
          : "info",
    title: candidate.title,
    description: candidate.summary,
    payload: {
      observation_id: observationId,
      rule_id: candidate.rule.rule_id,
      dedupe_key: candidate.dedupe_key,
      confidence: candidate.confidence,
      superseded_previous_id: existing?.id ?? null,
    },
    metadata: candidate.evidence,
    occurredAt: candidate.occurred_at,
  });

  return {
    observationId,
    eventEmitted: event.ok,
    supersededPreviousId: existing?.id ?? null,
  };
}

export async function emitObservationRuleSkippedEvent(
  ruleId: string,
  reason: string,
): Promise<boolean> {
  const event = await emitNexusEvent({
    source: "collector",
    category: "infra",
    eventType: "observation.rule.skipped",
    severity: "warning",
    title: `Observation rule skipped: ${ruleId}`,
    description: reason,
    payload: {
      rule_id: ruleId,
      reason,
    },
  });

  await logNexusActivity({
    actorType: "collector",
    action: "nexus.observation.rule_skipped",
    targetType: "nexus_observation_rule",
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
