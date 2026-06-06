import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import type { ObservationDbStatus } from "@/lib/observations/types";

const OWNER_TRIAGE_STATUSES = new Set<ObservationDbStatus>(["dismissed", "confirmed"]);

export async function updateOwnerObservationStatus(
  supabase: SupabaseClient,
  input: {
    observationId: string;
    ownerId: string;
    status: ObservationDbStatus;
  },
): Promise<{ ok: true; observationId: string; eventEmitted: boolean } | { ok: false; error: string }> {
  if (!OWNER_TRIAGE_STATUSES.has(input.status)) {
    return { ok: false, error: "Invalid observation status for owner triage" };
  }

  const { data: existing, error: readError } = await supabase
    .from("nexus_observations")
    .select("id, title, summary, category, severity, status, rule_id, metadata")
    .eq("id", input.observationId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!existing) {
    return { ok: false, error: "Observation not found" };
  }

  if (existing.status !== "active") {
    return { ok: false, error: "Only active observations can be dismissed or confirmed" };
  }

  const now = new Date().toISOString();
  const metadata = {
    ...((existing.metadata as Record<string, unknown>) ?? {}),
  };

  const updatePayload: Record<string, unknown> = {
    status: input.status,
    updated_at: now,
    metadata: safeProbeDetails(metadata),
  };

  if (input.status === "dismissed") {
    updatePayload.dismissed_at = now;
    updatePayload.dismissed_by = input.ownerId;
  }

  if (input.status === "confirmed") {
    metadata.confirmed_at = now;
    metadata.confirmed_by = input.ownerId;
    updatePayload.metadata = safeProbeDetails(metadata);
  }

  const { error: updateError } = await supabase
    .from("nexus_observations")
    .update(updatePayload)
    .eq("id", input.observationId)
    .eq("status", "active");

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const eventType =
    input.status === "dismissed" ? "observation.dismissed" : "observation.confirmed";

  const event = await emitNexusEvent({
    source: "manual",
    category: mapCategoryToEventCategory(existing.category as string),
    eventType,
    severity: existing.severity === "critical" ? "critical" : existing.severity === "warning" ? "warning" : "info",
    title: existing.title as string,
    description: existing.summary as string,
    payload: {
      observation_id: input.observationId,
      rule_id: existing.rule_id,
      status: input.status,
      owner_id: input.ownerId,
    },
    metadata: {
      previous_status: existing.status,
    },
  });

  await logNexusActivity({
    actorId: input.ownerId,
    actorType: "owner",
    action: `nexus.${eventType}`,
    targetType: "nexus_observation",
    targetId: input.observationId,
    details: {
      status: input.status,
      rule_id: existing.rule_id,
    },
  });

  return {
    ok: true,
    observationId: input.observationId,
    eventEmitted: event.ok,
  };
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
