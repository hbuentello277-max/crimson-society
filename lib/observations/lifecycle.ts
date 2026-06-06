import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { safeProbeDetails } from "@/lib/monitoring/redact";

const SUPERSEDED_RETENTION_MS = 30 * 24 * 60 * 60_000;
const CLEANUP_BATCH_LIMIT = 100;

export async function expireStaleObservations(
  admin: SupabaseClient,
  evaluatedAt: string,
): Promise<{ expired: number; eventsEmitted: number }> {
  const { data, error } = await admin
    .from("nexus_observations")
    .select("id, rule_id, title, summary, category, severity, metadata")
    .eq("status", "active")
    .not("valid_until", "is", null)
    .lt("valid_until", evaluatedAt)
    .limit(CLEANUP_BATCH_LIMIT);

  if (error || !data || data.length === 0) {
    return { expired: 0, eventsEmitted: 0 };
  }

  let expired = 0;
  let eventsEmitted = 0;

  for (const row of data) {
    const metadata = {
      ...((row.metadata as Record<string, unknown>) ?? {}),
      expired: true,
      expired_at: evaluatedAt,
      expiry_reason: "valid_until_elapsed",
    };

    const { error: updateError } = await admin
      .from("nexus_observations")
      .update({
        status: "superseded",
        metadata: safeProbeDetails(metadata),
        updated_at: evaluatedAt,
      })
      .eq("id", row.id as string)
      .eq("status", "active");

    if (updateError) {
      continue;
    }

    expired += 1;

    const event = await emitNexusEvent({
      source: "collector",
      category: "infra",
      eventType: "observation.expired",
      severity: "info",
      title: "Observation expired",
      description: row.title as string,
      payload: {
        observation_id: row.id,
        rule_id: row.rule_id,
        expired_at: evaluatedAt,
        reason: "valid_until_elapsed",
      },
      occurredAt: evaluatedAt,
    });

    if (event.ok) {
      eventsEmitted += 1;
    }
  }

  if (expired > 0) {
    await logNexusActivity({
      actorType: "collector",
      action: "nexus.observation_expiration.completed",
      targetType: "nexus",
      details: { expired_count: expired, evaluated_at: evaluatedAt },
    });
  }

  return { expired, eventsEmitted };
}

export async function cleanupSupersededObservations(
  admin: SupabaseClient,
  evaluatedAt: string,
): Promise<number> {
  const cutoff = new Date(Date.now() - SUPERSEDED_RETENTION_MS).toISOString();

  const { data, error } = await admin
    .from("nexus_observations")
    .select("id, metadata")
    .eq("status", "superseded")
    .lt("updated_at", cutoff)
    .limit(CLEANUP_BATCH_LIMIT);

  if (error || !data || data.length === 0) {
    return 0;
  }

  let cleaned = 0;

  for (const row of data) {
    const existingMetadata = (row.metadata as Record<string, unknown>) ?? {};
    if (existingMetadata.archived_at) {
      continue;
    }

    const metadata = {
      ...existingMetadata,
      archived_at: evaluatedAt,
      lifecycle: "superseded_retention",
    };

    const { error: updateError } = await admin
      .from("nexus_observations")
      .update({
        metadata: safeProbeDetails(metadata),
        updated_at: evaluatedAt,
      })
      .eq("id", row.id as string)
      .eq("status", "superseded");

    if (!updateError) {
      cleaned += 1;
    }
  }

  if (cleaned > 0) {
    await logNexusActivity({
      actorType: "collector",
      action: "nexus.observation_cleanup.completed",
      targetType: "nexus",
      details: { archived_count: cleaned, evaluated_at: evaluatedAt },
    });
  }

  return cleaned;
}
