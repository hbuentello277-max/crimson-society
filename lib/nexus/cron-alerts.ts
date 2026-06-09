import { emitNexusEvent } from "@/lib/events/emit";
import { createNexusServiceClient } from "@/lib/nexus/client";
import type { NexusCronJobDefinition } from "@/lib/nexus/cron-jobs";
import { logNexusActivity } from "@/lib/nexus/activity-log";

function cronAlertDedupeKey(slug: string): string {
  return `cron:job:${slug}`;
}

export async function notifyNexusCronJobFailure(
  job: NexusCronJobDefinition,
  error: string,
  durationMs: number,
): Promise<void> {
  const admin = createNexusServiceClient();
  const now = new Date().toISOString();
  const dedupeKey = cronAlertDedupeKey(job.slug);
  const title = `Platform job failed: ${job.label}`;
  const message = error || "Scheduled NEXUS job failed without an error message.";

  await emitNexusEvent({
    source: "cron",
    category: "infra",
    eventType: "cron.job.failed",
    severity: "critical",
    title,
    description: message,
    payload: {
      job_slug: job.slug,
      job_path: job.path,
      duration_ms: durationMs,
    },
  });

  const { data: existing } = await admin
    .from("nexus_alerts")
    .select("id, metadata")
    .eq("dedupe_key", dedupeKey)
    .in("status", ["active", "acknowledged"])
    .maybeSingle();

  const metadata = {
    ...(typeof existing?.metadata === "object" && existing.metadata ? existing.metadata : {}),
    job_slug: job.slug,
    job_path: job.path,
    duration_ms: durationMs,
    last_error: message,
    last_failed_at: now,
    impact_score: 72,
    owner_notes: [],
  };

  if (existing?.id) {
    await admin
      .from("nexus_alerts")
      .update({
        severity: "critical",
        title,
        message,
        metadata,
        updated_at: now,
      })
      .eq("id", existing.id);
  } else {
    await admin.from("nexus_alerts").insert({
      category: "infra",
      severity: "critical",
      title,
      message,
      status: "active",
      rule_id: `cron.${job.slug}`,
      dedupe_key: dedupeKey,
      metadata,
    });
  }

  await logNexusActivity({
    actorType: "collector",
    action: "nexus.cron.job_failed",
    targetType: "nexus_cron_job",
    details: {
      job_slug: job.slug,
      job_path: job.path,
      error: message,
      duration_ms: durationMs,
    },
  });
}

export async function resolveNexusCronJobFailure(job: NexusCronJobDefinition): Promise<void> {
  const admin = createNexusServiceClient();
  const now = new Date().toISOString();
  const dedupeKey = cronAlertDedupeKey(job.slug);

  const { data: existing } = await admin
    .from("nexus_alerts")
    .select("id")
    .eq("dedupe_key", dedupeKey)
    .in("status", ["active", "acknowledged"])
    .maybeSingle();

  if (!existing?.id) {
    return;
  }

  await admin
    .from("nexus_alerts")
    .update({
      status: "resolved",
      resolved_at: now,
      updated_at: now,
      message: `Platform job recovered: ${job.label}`,
    })
    .eq("id", existing.id);

  await emitNexusEvent({
    source: "cron",
    category: "recovery",
    eventType: "cron.job.recovered",
    severity: "info",
    title: `Platform job recovered: ${job.label}`,
    description: "Scheduled NEXUS job completed successfully after a prior failure.",
    payload: {
      job_slug: job.slug,
      job_path: job.path,
      alert_id: existing.id,
    },
  });
}
