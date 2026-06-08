export type ReelMediaStatus = "queued" | "processing" | "ready" | "failed" | string;

export function isReelMediaPending(status: ReelMediaStatus | null | undefined) {
  return status === "queued" || status === "processing";
}

export function isReelMediaFailed(status: ReelMediaStatus | null | undefined) {
  return status === "failed";
}

/** User-facing copy for reel processing states in feed and grids. */
export function getReelProcessingLabel(status: ReelMediaStatus | null | undefined) {
  switch (status) {
    case "queued":
      return "Reel queued for processing";
    case "processing":
      return "Processing reel…";
    case "failed":
      return "Reel processing failed. Try uploading again.";
    default:
      return null;
  }
}
