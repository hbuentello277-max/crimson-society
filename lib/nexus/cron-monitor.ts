import type { SupabaseClient } from "@supabase/supabase-js";
import {
  NEXUS_CRON_JOBS,
  getNexusCronJobActions,
  type NexusCronJobDefinition,
  type NexusCronJobSlug,
} from "@/lib/nexus/cron-jobs";
import { computeNextCronRunIso, isCronRunOverdue } from "@/lib/nexus/cron-schedule";

export type NexusCronJobStatus = "healthy" | "failed" | "overdue" | "never_run" | "unknown";

export type NexusCronJobHealth = {
  slug: NexusCronJobSlug;
  label: string;
  path: string;
  schedule: string;
  status: NexusCronJobStatus;
  last_run_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  next_expected_at: string;
};

export type NexusPlatformJobsSummary = {
  generated_at: string;
  overall_status: "healthy" | "degraded" | "critical" | "unknown";
  healthy_count: number;
  failed_count: number;
  overdue_count: number;
  never_run_count: number;
  jobs: NexusCronJobHealth[];
  last_nexus_run_at: string | null;
};

type ActivityRow = {
  action: string;
  created_at: string;
  details: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickLatestRun(rows: ActivityRow[], actions: string[]): ActivityRow | null {
  const actionSet = new Set(actions);
  const matches = rows.filter((row) => actionSet.has(row.action));
  if (matches.length === 0) {
    return null;
  }

  return matches.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

function deriveJobStatus(
  job: NexusCronJobDefinition,
  latest: ActivityRow | null,
  lastSuccessAt: string | null,
  now: Date,
): NexusCronJobStatus {
  if (!latest) {
    return "never_run";
  }

  const details = asRecord(latest.details);
  const ok = details?.ok;
  if (ok === false) {
    return "failed";
  }

  if (isCronRunOverdue(lastSuccessAt ?? latest.created_at, job.schedule, now)) {
    return "overdue";
  }

  if (ok === true || ok === undefined) {
    return "healthy";
  }

  return "unknown";
}

function overallStatusFromJobs(jobs: NexusCronJobHealth[]): NexusPlatformJobsSummary["overall_status"] {
  if (jobs.some((job) => job.status === "failed")) {
    return "critical";
  }
  if (jobs.some((job) => job.status === "overdue" || job.status === "never_run")) {
    return "degraded";
  }
  if (jobs.some((job) => job.status === "unknown")) {
    return "unknown";
  }
  return "healthy";
}

export function buildNexusCronJobHealth(
  job: NexusCronJobDefinition,
  rows: ActivityRow[],
  now = new Date(),
): NexusCronJobHealth {
  const actions = getNexusCronJobActions(job);
  const latest = pickLatestRun(rows, actions);
  const successRows = rows
    .filter((row) => actions.includes(row.action))
    .filter((row) => {
      const details = asRecord(row.details);
      return details?.ok !== false;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const failureRows = rows
    .filter((row) => actions.includes(row.action))
    .filter((row) => asRecord(row.details)?.ok === false)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const lastSuccessAt = successRows[0]?.created_at ?? null;
  const lastFailureAt = failureRows[0]?.created_at ?? null;
  const latestDetails = asRecord(latest?.details);
  const durationMs =
    typeof latestDetails?.duration_ms === "number" ? latestDetails.duration_ms : null;
  const errorMessage =
    typeof latestDetails?.error === "string"
      ? latestDetails.error
      : latest?.action && asRecord(latest.details)?.ok === false
        ? "Scheduled job failed"
        : null;

  return {
    slug: job.slug,
    label: job.label,
    path: job.path,
    schedule: job.schedule,
    status: deriveJobStatus(job, latest, lastSuccessAt, now),
    last_run_at: latest?.created_at ?? null,
    last_success_at: lastSuccessAt,
    last_failure_at: lastFailureAt,
    duration_ms: durationMs,
    error_message: errorMessage,
    next_expected_at: computeNextCronRunIso(job.schedule, now),
  };
}

export async function getNexusPlatformJobsSummary(
  supabase: SupabaseClient,
): Promise<NexusPlatformJobsSummary> {
  const now = new Date();
  const lookbackMs = Math.max(...NEXUS_CRON_JOBS.map((job) => job.intervalMinutes)) * 60_000 * 4;
  const since = new Date(now.getTime() - lookbackMs).toISOString();
  const actions = NEXUS_CRON_JOBS.flatMap((job) => getNexusCronJobActions(job));

  const { data, error } = await supabase
    .from("nexus_activity_log")
    .select("action, created_at, details")
    .in("action", actions)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(250);

  const rows: ActivityRow[] = (data ?? []).map((row) => ({
    action: String(row.action),
    created_at: String(row.created_at),
    details: asRecord(row.details),
  }));

  const jobs = NEXUS_CRON_JOBS.map((job) => buildNexusCronJobHealth(job, rows, now));
  const lastNexusRunAt =
    rows.length > 0
      ? rows.reduce((latest, row) =>
          new Date(row.created_at).getTime() > new Date(latest).getTime() ? row.created_at : latest,
        rows[0].created_at)
      : null;

  return {
    generated_at: now.toISOString(),
    overall_status: error ? "unknown" : overallStatusFromJobs(jobs),
    healthy_count: jobs.filter((job) => job.status === "healthy").length,
    failed_count: jobs.filter((job) => job.status === "failed").length,
    overdue_count: jobs.filter((job) => job.status === "overdue").length,
    never_run_count: jobs.filter((job) => job.status === "never_run").length,
    jobs,
    last_nexus_run_at: lastNexusRunAt,
  };
}
