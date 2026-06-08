import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MEDIA_ORIGINALS_BUCKET,
  MEDIA_RENDERS_BUCKET,
  VIDEO_MAX_DURATION_SECONDS,
} from "@/lib/media";
import { probeVideoFile, runFfmpeg } from "@/lib/media/ffmpeg-bin";
import { reelRenderPaths } from "@/lib/media/reel-paths";

export type MediaProcessingJobRow = {
  id: string;
  post_id: string | null;
  user_id: string;
  media_kind: string;
  source_bucket: string;
  source_path: string;
  status: string;
  attempts: number;
  metadata: Record<string, unknown>;
};

export type ProcessReelResult = {
  playbackUrl: string;
  thumbnailUrl: string;
  playbackPath: string;
  thumbnailPath: string;
  durationSeconds: number;
  width: number | null;
  height: number | null;
};

function publicUrl(adminClient: SupabaseClient, path: string) {
  const {
    data: { publicUrl },
  } = adminClient.storage.from(MEDIA_RENDERS_BUCKET).getPublicUrl(path);
  return publicUrl;
}

export async function processReelJob(
  adminClient: SupabaseClient,
  job: MediaProcessingJobRow,
): Promise<ProcessReelResult> {
  if (job.media_kind !== "video") {
    throw new Error(`Unsupported media kind: ${job.media_kind}`);
  }

  const workDir = join(tmpdir(), `reel-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  const sourceExt = job.source_path.split(".").pop() || "mp4";
  const inputPath = join(workDir, `source.${sourceExt}`);
  const thumbnailPath = join(workDir, "thumbnail.jpg");
  const playbackPath = join(workDir, "playback.mp4");

  try {
    const { data: downloadData, error: downloadError } = await adminClient.storage
      .from(job.source_bucket || MEDIA_ORIGINALS_BUCKET)
      .download(job.source_path);

    if (downloadError || !downloadData) {
      throw new Error(downloadError?.message || "Could not download source video.");
    }

    const sourceBuffer = Buffer.from(await downloadData.arrayBuffer());
    await writeFile(inputPath, sourceBuffer);

    const probe = await probeVideoFile(inputPath);
    if (probe.durationSeconds > VIDEO_MAX_DURATION_SECONDS) {
      throw new Error(
        `Video exceeds ${VIDEO_MAX_DURATION_SECONDS} seconds maximum (${Math.ceil(probe.durationSeconds)}s).`,
      );
    }

    await runFfmpeg([
      "-y",
      "-ss",
      "1",
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      thumbnailPath,
    ]);

    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "-pix_fmt",
      "yuv420p",
      playbackPath,
    ]);

    const renderPaths = reelRenderPaths(job.source_path);
    const thumbnailBytes = await readFile(thumbnailPath);
    const playbackBytes = await readFile(playbackPath);

    const { error: thumbUploadError } = await adminClient.storage
      .from(MEDIA_RENDERS_BUCKET)
      .upload(renderPaths.thumbnailPath, thumbnailBytes, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: true,
      });

    if (thumbUploadError) {
      throw new Error(thumbUploadError.message);
    }

    const { error: playbackUploadError } = await adminClient.storage
      .from(MEDIA_RENDERS_BUCKET)
      .upload(renderPaths.playbackPath, playbackBytes, {
        contentType: "video/mp4",
        cacheControl: "31536000",
        upsert: true,
      });

    if (playbackUploadError) {
      throw new Error(playbackUploadError.message);
    }

    return {
      playbackUrl: publicUrl(adminClient, renderPaths.playbackPath),
      thumbnailUrl: publicUrl(adminClient, renderPaths.thumbnailPath),
      playbackPath: renderPaths.playbackPath,
      thumbnailPath: renderPaths.thumbnailPath,
      durationSeconds: Math.round(probe.durationSeconds),
      width: probe.width,
      height: probe.height,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
