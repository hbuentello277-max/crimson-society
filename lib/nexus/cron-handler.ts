import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import {
  notifyNexusCronJobFailure,
  resolveNexusCronJobFailure,
} from "@/lib/nexus/cron-alerts";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { NEXUS_CRON_JOB_BY_SLUG, type NexusCronJobSlug } from "@/lib/nexus/cron-jobs";

export class NexusCronJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NexusCronJobError";
  }
}

type NexusCronHandlerResult = {
  body: Record<string, unknown>;
  details?: Record<string, unknown>;
};

export async function runNexusCronRoute(
  slug: NexusCronJobSlug,
  handler: () => Promise<NexusCronHandlerResult>,
): Promise<NextResponse> {
  const job = NEXUS_CRON_JOB_BY_SLUG[slug];
  const startedAt = Date.now();

  try {
    const result = await handler();
    const durationMs = Date.now() - startedAt;

    await logNexusActivity({
      actorType: "collector",
      action: job.activityAction,
      targetType: "nexus_cron_job",
      details: {
        ok: true,
        duration_ms: durationMs,
        job_slug: job.slug,
        job_path: job.path,
        ...(result.details ?? {}),
      },
    });

    await resolveNexusCronJobFailure(job);

    return NextResponse.json({
      ok: true,
      job_slug: job.slug,
      duration_ms: durationMs,
      ...result.body,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message =
      error instanceof NexusCronJobError
        ? error.message
        : error instanceof Error
          ? error.message
          : `${job.label} failed`;

    await logNexusActivity({
      actorType: "collector",
      action: job.activityAction,
      targetType: "nexus_cron_job",
      details: {
        ok: false,
        duration_ms: durationMs,
        job_slug: job.slug,
        job_path: job.path,
        error: message,
      },
    });

    await notifyNexusCronJobFailure(job, message, durationMs);

    return NextResponse.json(
      {
        ok: false,
        job_slug: job.slug,
        error: message,
        duration_ms: durationMs,
      },
      { status: 500 },
    );
  }
}

export function nexusCronUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function assertNexusCronAuthorized(request: Request): boolean {
  return isCronAuthorized(request);
}
