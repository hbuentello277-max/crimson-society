const DEFAULT_MODEL = "o4-mini";

export type AiAnalysisConfigStatus = {
  api_key_detected: boolean;
  model: string;
  model_source: "env" | "default";
  configured: boolean;
};

export function getDefaultNexusAiModel(): string {
  return DEFAULT_MODEL;
}

export function resolveNexusAiModel(): string {
  const fromEnv = process.env.OPENAI_NEXUS_MODEL?.trim();
  return fromEnv || DEFAULT_MODEL;
}

export function isOpenAiApiKeyConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getAiAnalysisConfigStatus(): AiAnalysisConfigStatus {
  const modelFromEnv = process.env.OPENAI_NEXUS_MODEL?.trim();
  const api_key_detected = isOpenAiApiKeyConfigured();

  return {
    api_key_detected,
    model: modelFromEnv || DEFAULT_MODEL,
    model_source: modelFromEnv ? "env" : "default",
    configured: api_key_detected,
  };
}
