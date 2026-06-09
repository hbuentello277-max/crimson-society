import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { isNexusVoiceAiConfigured } from "@/lib/admin/nexus-voice/config";
import {
  isOpenAiQuotaOrRateLimitError,
  NEXUS_VOICE_TRANSCRIPTION_UNAVAILABLE_MESSAGE,
} from "@/lib/admin/nexus-voice/user-errors";

export class NexusVoiceTranscriptionError extends Error {
  readonly code: "not_configured" | "transcription_failed" | "quota_exceeded";

  constructor(
    code: "not_configured" | "transcription_failed" | "quota_exceeded",
    message: string,
  ) {
    super(message);
    this.name = "NexusVoiceTranscriptionError";
    this.code = code;
  }
}

function extensionForMimeType(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() || mimeType;
  if (base.includes("webm")) return "webm";
  if (base.includes("mp4") || base.includes("m4a")) return "m4a";
  if (base.includes("mpeg") || base.includes("mp3")) return "mp3";
  if (base.includes("wav")) return "wav";
  return "webm";
}

export async function transcribeNexusVoiceAudio(
  audio: Buffer,
  mimeType: string,
): Promise<string> {
  if (!isNexusVoiceAiConfigured()) {
    throw new NexusVoiceTranscriptionError(
      "not_configured",
      "NEXUS voice AI is not configured yet.",
    );
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!.trim(),
    timeout: 60_000,
    maxRetries: 1,
  });

  const ext = extensionForMimeType(mimeType);
  const file = await toFile(audio, `nexus-voice.${ext}`, { type: mimeType });

  try {
    const result = await client.audio.transcriptions.create({
      model: "whisper-1",
      file,
      language: "en",
    });

    const text = result.text?.trim();
    if (!text) {
      throw new NexusVoiceTranscriptionError(
        "transcription_failed",
        "Could not transcribe audio. Try speaking again.",
      );
    }

    return text;
  } catch (error) {
    if (error instanceof NexusVoiceTranscriptionError) {
      throw error;
    }

    if (isOpenAiQuotaOrRateLimitError(error)) {
      console.error("[nexus-voice] OpenAI transcription quota exceeded", error);
      throw new NexusVoiceTranscriptionError(
        "quota_exceeded",
        NEXUS_VOICE_TRANSCRIPTION_UNAVAILABLE_MESSAGE,
      );
    }

    console.error("[nexus-voice] transcription failed", error);
    throw new NexusVoiceTranscriptionError(
      "transcription_failed",
      "Could not transcribe audio. Try again or type your command.",
    );
  }
}
