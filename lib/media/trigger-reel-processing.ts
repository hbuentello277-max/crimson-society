import { authedFetch } from "@/lib/auth/authed-fetch";

export type TriggerReelProcessingResult = {
  ok: boolean;
  status: number;
  processed?: number;
  succeeded?: number;
  failed?: number;
  error?: string;
  results?: Array<{
    jobId: string;
    postId: string | null;
    status: string;
    error?: string;
  }>;
};

/** Kick off immediate reel processing after upload (server uses service role). */
export async function triggerReelProcessing(
  postId: string,
): Promise<TriggerReelProcessingResult> {
  const response = await authedFetch("/api/media/process", {
    method: "POST",
    body: JSON.stringify({ postId, limit: 1 }),
  });

  const payload = (await response.json().catch(() => ({}))) as TriggerReelProcessingResult & {
    error?: string;
  };

  if (!response.ok) {
    const error = payload.error || `Processing request failed (${response.status}).`;
    console.warn("[reel-processing] immediate process failed", {
      postId,
      status: response.status,
      error,
    });
    return { ok: false, status: response.status, error };
  }

  console.info("[reel-processing] immediate process finished", {
    postId,
    processed: payload.processed,
    succeeded: payload.succeeded,
    failed: payload.failed,
    results: payload.results,
  });

  return {
    ok: true,
    status: response.status,
    processed: payload.processed,
    succeeded: payload.succeeded,
    failed: payload.failed,
    results: payload.results,
    error: payload.failed ? payload.results?.[0]?.error : undefined,
  };
}
