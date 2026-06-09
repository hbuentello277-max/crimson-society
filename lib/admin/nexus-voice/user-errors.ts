export const NEXUS_VOICE_TRANSCRIPTION_UNAVAILABLE_MESSAGE =
  "NEXUS voice transcription is temporarily unavailable. You can still type a command.";

const OPENAI_RAW_PATTERNS = [
  /429/i,
  /quota/i,
  /insufficient_quota/i,
  /exceeded your current quota/i,
  /openai/i,
  /platform\.openai\.com/i,
  /docs\.api\.openai\.com/i,
];

export function isOpenAiQuotaOrRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    const message = String(error ?? "");
    return OPENAI_RAW_PATTERNS.some((pattern) => pattern.test(message));
  }

  const record = error as { status?: number; message?: string; code?: string; type?: string };
  const message = record.message ?? "";
  const code = record.code ?? "";
  const type = record.type ?? "";

  if (record.status === 429) return true;

  return (
    OPENAI_RAW_PATTERNS.some((pattern) => pattern.test(message)) ||
    OPENAI_RAW_PATTERNS.some((pattern) => pattern.test(code)) ||
    OPENAI_RAW_PATTERNS.some((pattern) => pattern.test(type))
  );
}

export function toNexusVoiceUserError(
  error: unknown,
  fallback = "NEXUS voice request failed. Try again or type a command.",
): { message: string; transcriptionUnavailable: boolean } {
  if (isOpenAiQuotaOrRateLimitError(error)) {
    return {
      message: NEXUS_VOICE_TRANSCRIPTION_UNAVAILABLE_MESSAGE,
      transcriptionUnavailable: true,
    };
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (OPENAI_RAW_PATTERNS.some((pattern) => pattern.test(message))) {
      return {
        message: NEXUS_VOICE_TRANSCRIPTION_UNAVAILABLE_MESSAGE,
        transcriptionUnavailable: true,
      };
    }
  }

  return { message: fallback, transcriptionUnavailable: false };
}
