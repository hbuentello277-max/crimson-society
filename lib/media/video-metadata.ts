import { VIDEO_MAX_DURATION_SECONDS } from "@/lib/media";

/** Client-side duration probe via HTMLVideoElement metadata. */
export function probeVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        reject(new Error("Could not read video duration."));
        return;
      }
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read video metadata."));
    };

    video.src = objectUrl;
  });
}

export async function assertVideoDurationWithinLimit(file: File) {
  const duration = await probeVideoDurationSeconds(file);
  if (duration > VIDEO_MAX_DURATION_SECONDS) {
    throw new Error(
      `Reels can be up to ${VIDEO_MAX_DURATION_SECONDS} seconds. Trim your video and try again.`,
    );
  }
  return duration;
}
