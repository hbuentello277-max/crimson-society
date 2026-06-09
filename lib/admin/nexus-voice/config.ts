export const NEXUS_VOICE_NOT_CONFIGURED_MESSAGE =
  "NEXUS voice AI is not configured yet.";

export function isNexusVoiceAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
