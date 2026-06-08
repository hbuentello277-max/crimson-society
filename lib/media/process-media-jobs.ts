import type { SupabaseClient } from "@supabase/supabase-js";
import {
  processReelJob,
  type MediaProcessingJobRow,
} from "@/lib/media/process-reel-job";

export const MAX_MEDIA_JOB_ATTEMPTS = 3;
export const STALE_PROCESSING_MINUTES = 15;

const STALE_RECOVERY_ERROR =
  "Processing timed out or the worker stopped; job was requeued.";
const STALE_MAX_ATTEMPTS_ERROR =
  "Processing failed after the maximum number of attempts (stale recovery).";

export type StaleRecoveryAction = "requeue" | "fail";

/** Pure helper for stale-job recovery decisions (attempts are set on claim). */
export function staleRecoveryAction(attempts: number): StaleRecoveryAction {
  return attempts >= MAX_MEDIA_JOB_ATTEMPTS ? "fail" : "requeue";
}

export type StaleJobRecoveryResult = {
  requeued: number;
  failed: number;
};

export type ProcessMediaJobsResult = {
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{
    jobId: string;
    postId: string | null;
    status: "ready" | "failed";
    error?: string;
  }>;
  staleRecovery?: StaleJobRecoveryResult;
};

export function staleProcessingCutoffIso(now = Date.now()) {
  return new Date(now - STALE_PROCESSING_MINUTES * 60 * 1000).toISOString();
}

export async function recoverStaleProcessingJobs(
  adminClient: SupabaseClient,
  options?: { now?: number },
): Promise<StaleJobRecoveryResult> {
  const staleBefore = staleProcessingCutoffIso(options?.now);

  const { data: staleJobs, error } = await adminClient
    .from("media_processing_jobs")
    .select("*")
    .eq("status", "processing")
    .eq("media_kind", "video")
    .lt("updated_at", staleBefore);

  if (error) {
    throw new Error(error.message);
  }

  let requeued = 0;
  let failed = 0;

  for (const job of (staleJobs || []) as MediaProcessingJobRow[]) {
    const attempts = job.attempts || 0;

    if (staleRecoveryAction(attempts) === "fail") {
      await markJobFailed(adminClient, job, STALE_MAX_ATTEMPTS_ERROR);
      failed += 1;
      continue;
    }

    const { data: requeuedJob } = await adminClient
      .from("media_processing_jobs")
      .update({
        status: "queued",
        error_message: STALE_RECOVERY_ERROR,
      })
      .eq("id", job.id)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();

    if (!requeuedJob) {
      continue;
    }

    if (job.post_id) {
      await adminClient
        .from("Posts")
        .update({ media_status: "queued" })
        .eq("id", job.post_id)
        .eq("media_status", "processing");
    }

    requeued += 1;
  }

  return { requeued, failed };
}

async function claimQueuedJobs(
  adminClient: SupabaseClient,
  limit: number,
  postId?: string | null,
) {
  let query = adminClient
    .from("media_processing_jobs")
    .select("*")
    .eq("status", "queued")
    .eq("media_kind", "video")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (postId) {
    query = query.eq("post_id", postId);
  }

  const { data: jobs, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const claimed: MediaProcessingJobRow[] = [];

  for (const job of (jobs || []) as MediaProcessingJobRow[]) {
    const { data: updated, error: claimError } = await adminClient
      .from("media_processing_jobs")
      .update({
        status: "processing",
        attempts: (job.attempts || 0) + 1,
        error_message: null,
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();

    if (!claimError && updated) {
      claimed.push(updated as MediaProcessingJobRow);
    }
  }

  return claimed;
}

async function markJobFailed(
  adminClient: SupabaseClient,
  job: MediaProcessingJobRow,
  message: string,
) {
  await adminClient
    .from("media_processing_jobs")
    .update({
      status: "failed",
      error_message: message.slice(0, 2000),
    })
    .eq("id", job.id);

  if (job.post_id) {
    await adminClient
      .from("Posts")
      .update({
        media_status: "failed",
        media_metadata: {
          ...(job.metadata || {}),
          processing_error: message.slice(0, 500),
        },
      })
      .eq("id", job.post_id);
  }
}

async function markJobReady(
  adminClient: SupabaseClient,
  job: MediaProcessingJobRow,
  result: Awaited<ReturnType<typeof processReelJob>>,
) {
  await adminClient
    .from("media_processing_jobs")
    .update({
      status: "ready",
      error_message: null,
      metadata: {
        ...(job.metadata || {}),
        playback_path: result.playbackPath,
        thumbnail_path: result.thumbnailPath,
        duration_seconds: result.durationSeconds,
      },
    })
    .eq("id", job.id);

  if (job.post_id) {
    await adminClient
      .from("Posts")
      .update({
        media_status: "ready",
        video_playback_url: result.playbackUrl,
        video_thumbnail_url: result.thumbnailUrl,
        video_duration_seconds: result.durationSeconds,
        video_width: result.width,
        video_height: result.height,
        media_metadata: {
          ...(job.metadata || {}),
          pipeline: "reel-mp4-playback",
          thumbnail_at_seconds: 1,
        },
      })
      .eq("id", job.post_id);
  }
}

export async function processPendingMediaJobs(
  adminClient: SupabaseClient,
  options?: { limit?: number; postId?: string | null },
): Promise<ProcessMediaJobsResult> {
  const limit = Math.min(Math.max(options?.limit ?? 3, 1), 10);
  const staleRecovery = await recoverStaleProcessingJobs(adminClient);
  const jobs = await claimQueuedJobs(adminClient, limit, options?.postId);

  const results: ProcessMediaJobsResult["results"] = [];
  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    if (job.post_id) {
      await adminClient
        .from("Posts")
        .update({ media_status: "processing" })
        .eq("id", job.post_id)
        .in("media_status", ["queued", "processing"]);
    }

    try {
      const result = await processReelJob(adminClient, job);
      await markJobReady(adminClient, job, result);
      succeeded += 1;
      results.push({
        jobId: job.id,
        postId: job.post_id,
        status: "ready",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reel processing failed.";
      const attempts = job.attempts || 1;

      if (attempts >= MAX_MEDIA_JOB_ATTEMPTS) {
        await markJobFailed(adminClient, job, message);
      } else {
        await adminClient
          .from("media_processing_jobs")
          .update({
            status: "queued",
            error_message: message.slice(0, 2000),
          })
          .eq("id", job.id);

        if (job.post_id) {
          await adminClient
            .from("Posts")
            .update({ media_status: "queued" })
            .eq("id", job.post_id);
        }
      }

      failed += 1;
      results.push({
        jobId: job.id,
        postId: job.post_id,
        status: "failed",
        error: message,
      });
    }
  }

  return {
    processed: jobs.length,
    succeeded,
    failed,
    results,
    staleRecovery,
  };
}
