import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access } from "node:fs/promises";
import { constants } from "node:fs";

const execFileAsync = promisify(execFile);

async function pathExists(path: string) {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function resolveFfmpegPath() {
  const fromPackage = await import("ffmpeg-static").then((mod) => mod.default || null);
  if (fromPackage && (await pathExists(fromPackage))) {
    return fromPackage;
  }

  if (await pathExists("/usr/bin/ffmpeg")) {
    return "/usr/bin/ffmpeg";
  }

  throw new Error("ffmpeg is not available in this environment.");
}

export async function resolveFfprobePath() {
  const fromPackage = await import("ffprobe-static").then((mod) => mod.path || null);
  if (fromPackage && (await pathExists(fromPackage))) {
    return fromPackage;
  }

  if (await pathExists("/usr/bin/ffprobe")) {
    return "/usr/bin/ffprobe";
  }

  throw new Error("ffprobe is not available in this environment.");
}

export type VideoProbeResult = {
  durationSeconds: number;
  width: number | null;
  height: number | null;
};

export async function probeVideoFile(filePath: string): Promise<VideoProbeResult> {
  const ffprobe = await resolveFfprobePath();
  const { stdout } = await execFileAsync(ffprobe, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    filePath,
  ]);

  const parsed = JSON.parse(stdout) as {
    streams?: Array<{ width?: number; height?: number }>;
    format?: { duration?: string };
  };

  const duration = Number(parsed.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Could not determine video duration.");
  }

  const stream = parsed.streams?.[0];
  return {
    durationSeconds: duration,
    width: typeof stream?.width === "number" ? stream.width : null,
    height: typeof stream?.height === "number" ? stream.height : null,
  };
}

export async function runFfmpeg(args: string[]) {
  const ffmpeg = await resolveFfmpegPath();
  await execFileAsync(ffmpeg, args, { maxBuffer: 10 * 1024 * 1024 });
}
