import { DM_AUDIO_MIME_TYPES } from "@/lib/messages/dm-message";

/** V1 voice memo limits */
export const DM_VOICE_MAX_SECONDS = 60;
export const DM_VOICE_MIN_SECONDS = 1;

export const VOICE_UNSUPPORTED_MESSAGE =
  "Voice notes are not supported on this device yet.";

const RECORDING_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/m4a",
] as const;

export function isVoiceRecordingSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof MediaRecorder === "undefined") return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  return pickVoiceRecordingMimeType() !== null;
}

/** Best MIME type for MediaRecorder on this device, or null if none. */
export function pickVoiceRecordingMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;

  for (const mime of RECORDING_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }

  return null;
}

/** Normalize recorder MIME for storage validation (strip codecs suffix). */
export function normalizeRecordedMimeType(mime: string): string {
  const base = mime.split(";")[0]?.trim().toLowerCase() || mime;
  if (base === "audio/x-m4a") return "audio/m4a";
  if (DM_AUDIO_MIME_TYPES.has(base)) return base;
  if (base.startsWith("audio/webm")) return "audio/webm";
  if (base.startsWith("audio/mp4")) return "audio/mp4";
  return base;
}

export function formatVoiceTimer(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function voiceBlobToFile(blob: Blob, mimeType: string) {
  const normalized = normalizeRecordedMimeType(mimeType);
  const ext =
    normalized === "audio/webm"
      ? "webm"
      : normalized === "audio/mp4" || normalized === "audio/m4a"
        ? "m4a"
        : normalized === "audio/mpeg"
          ? "mp3"
          : normalized === "audio/aac"
            ? "aac"
            : "webm";
  return new File([blob], `voice-${Date.now()}.${ext}`, { type: normalized });
}

export type VoiceRecorderSession = {
  stop: () => Promise<{ blob: Blob; durationSeconds: number; mimeType: string } | null>;
  cancel: () => void;
};

export async function startVoiceRecorderSession(
  maxSeconds: number,
): Promise<VoiceRecorderSession> {
  const mimeType = pickVoiceRecordingMimeType();
  if (!mimeType) {
    throw new Error(VOICE_UNSUPPORTED_MESSAGE);
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType });
  const startedAt = Date.now();
  let maxTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const cleanupStream = () => {
    for (const track of stream.getTracks()) track.stop();
  };

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopPromise = new Promise<{
    blob: Blob;
    durationSeconds: number;
    mimeType: string;
  } | null>((resolve) => {
    recorder.onstop = () => {
      cleanupStream();
      if (stopped) {
        resolve(null);
        return;
      }
      const durationSeconds = Math.max(0, (Date.now() - startedAt) / 1000);
      const blob = new Blob(chunks, { type: normalizeRecordedMimeType(recorder.mimeType || mimeType) });
      resolve({
        blob,
        durationSeconds,
        mimeType: normalizeRecordedMimeType(recorder.mimeType || mimeType),
      });
    };

    recorder.onerror = () => {
      cleanupStream();
      resolve(null);
    };
  });

  recorder.start(250);

  maxTimer = setTimeout(() => {
    if (recorder.state === "recording") recorder.stop();
  }, maxSeconds * 1000);

  return {
    cancel: () => {
      stopped = true;
      if (maxTimer) clearTimeout(maxTimer);
      if (recorder.state !== "inactive") recorder.stop();
      else cleanupStream();
    },
    stop: async () => {
      if (maxTimer) clearTimeout(maxTimer);
      if (recorder.state === "recording") recorder.stop();
      return stopPromise;
    },
  };
}
