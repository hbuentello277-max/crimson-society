import type { SupabaseClient } from "@supabase/supabase-js";
import { getAiAnalysisConfigStatus, resolveNexusAiModel } from "@/lib/ai-analysis/config";
import { loadAnalysisContext } from "@/lib/ai-analysis/context";
import {
  AiAnalysisError,
  assertAiAnalysisConfigured,
  createNexusOpenAiClient,
  mapOpenAiError,
} from "@/lib/ai-analysis/errors";
import {
  buildGroundingPacket,
  sanitizeAnalysisSources,
  sanitizeRelatedRoutes,
  selectConsultedSources,
} from "@/lib/ai-analysis/grounding";
import {
  ANALYSIS_OUTPUT_JSON_SCHEMA,
  ANALYSIS_SOURCE_ROUTES,
  NEXUS_AI_SYSTEM_PROMPT,
  normalizeAnalysisQuestion,
} from "@/lib/ai-analysis/prompts";
import type { AnalysisResponse, AnalysisSource, StructuredAnalysisOutput } from "@/lib/ai-analysis/types";
import { createNexusServiceClient } from "@/lib/nexus/client";

const OPENAI_REQUEST_TIMEOUT_MS = 60_000;

function routesForSources(sources: AnalysisSource[]): string[] {
  return sources
    .map((source) => ANALYSIS_SOURCE_ROUTES[source])
    .filter((route): route is string => Boolean(route));
}

function parseStructuredOutput(raw: string): StructuredAnalysisOutput {
  try {
    const parsed = JSON.parse(raw) as Partial<StructuredAnalysisOutput>;

    if (typeof parsed.analysis !== "string" || !parsed.analysis.trim()) {
      throw new AiAnalysisError({
        code: "empty_response",
        status: 502,
        userMessage: "OpenAI service temporarily unavailable.",
      });
    }

    const confidence =
      typeof parsed.confidence === "number" ? Math.round(parsed.confidence) : 70;

    const sources = sanitizeAnalysisSources(
      Array.isArray(parsed.sources) ? parsed.sources.map(String) : [],
    );

    const related_routes = sanitizeRelatedRoutes(
      Array.isArray(parsed.related_routes) ? parsed.related_routes.map(String) : [],
    );

    return {
      analysis: parsed.analysis.trim(),
      confidence: Math.min(100, Math.max(0, confidence)),
      sources,
      related_routes:
        related_routes.length > 0 ? related_routes : routesForSources(sources),
    };
  } catch (error) {
    if (error instanceof AiAnalysisError) {
      throw error;
    }

    throw new AiAnalysisError({
      code: "parse_error",
      status: 502,
      userMessage: "OpenAI service temporarily unavailable.",
      cause: error,
    });
  }
}

async function logAnalysisAudit(input: {
  ownerId: string;
  question: string;
  sources: AnalysisSource[];
}): Promise<boolean> {
  const admin = createNexusServiceClient();
  const { error } = await admin.from("nexus_ai_analysis_log").insert({
    owner_id: input.ownerId,
    question: input.question,
    sources_consulted: input.sources,
  });

  if (error) {
    console.error("Failed to write nexus_ai_analysis_log:", error.message);
    return false;
  }

  return true;
}

export function getNexusAiModel(): string {
  return resolveNexusAiModel();
}

export function getNexusAiConfigStatus() {
  return getAiAnalysisConfigStatus();
}

export type OpenAiProbeResult = {
  ok: boolean;
  model: string;
  configured: boolean;
  api_key_detected: boolean;
  model_source: "env" | "default";
  latency_ms: number | null;
  error: string | null;
  error_code: string | null;
};

export async function probeOpenAiConnection(): Promise<OpenAiProbeResult> {
  const config = getAiAnalysisConfigStatus();
  const started = Date.now();

  if (!config.configured) {
    return {
      ok: false,
      model: config.model,
      configured: false,
      api_key_detected: false,
      model_source: config.model_source,
      latency_ms: null,
      error: "AI Analysis is not configured.",
      error_code: "not_configured",
    };
  }

  try {
    const client = createNexusOpenAiClient();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS);

    try {
      const response = await client.responses.create(
        {
          model: config.model,
          instructions: "Reply with the single word OK.",
          input: "ping",
          max_output_tokens: 16,
        },
        { signal: controller.signal },
      );

      const output = response.output_text?.trim();
      if (!output) {
        throw new AiAnalysisError({
          code: "empty_response",
          status: 502,
          userMessage: "OpenAI service temporarily unavailable.",
        });
      }

      return {
        ok: true,
        model: config.model,
        configured: true,
        api_key_detected: true,
        model_source: config.model_source,
        latency_ms: Date.now() - started,
        error: null,
        error_code: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const mapped = mapOpenAiError(error);
    return {
      ok: false,
      model: config.model,
      configured: config.configured,
      api_key_detected: config.api_key_detected,
      model_source: config.model_source,
      latency_ms: Date.now() - started,
      error: mapped.userMessage,
      error_code: mapped.code,
    };
  }
}

export async function runNexusAiAnalysis(
  supabase: SupabaseClient,
  ownerId: string,
  question: string,
): Promise<AnalysisResponse & { consulted_sources: AnalysisSource[]; audit_logged: boolean }> {
  const normalized = normalizeAnalysisQuestion(question);
  if (!normalized) {
    throw new AiAnalysisError({
      code: "invalid_request",
      status: 400,
      userMessage: "question is required.",
    });
  }

  assertAiAnalysisConfigured();

  const consultedSources = selectConsultedSources(normalized);

  try {
    const context = await loadAnalysisContext(supabase);
    const grounding = buildGroundingPacket(context, consultedSources);
    const client = createNexusOpenAiClient();
    const model = resolveNexusAiModel();

    const userInput = [
      `Owner question: ${normalized}`,
      "",
      "Grounding packet (JSON):",
      JSON.stringify(grounding),
      "",
      `Consulted sources for this request: ${consultedSources.join(", ")}`,
      "Only cite facts present in the grounding packet.",
    ].join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await client.responses.create(
        {
          model,
          instructions: NEXUS_AI_SYSTEM_PROMPT,
          input: userInput,
          max_output_tokens: 1200,
          text: {
            format: {
              type: "json_schema",
              name: "nexus_analysis",
              strict: true,
              schema: ANALYSIS_OUTPUT_JSON_SCHEMA,
            },
          },
        },
        { signal: controller.signal },
      );
    } finally {
      clearTimeout(timeout);
    }

    const rawOutput = response.output_text?.trim();
    if (!rawOutput) {
      throw new AiAnalysisError({
        code: "empty_response",
        status: 502,
        userMessage: "OpenAI service temporarily unavailable.",
      });
    }

    const structured = parseStructuredOutput(rawOutput);
    const mergedSources = sanitizeAnalysisSources([
      ...structured.sources,
      ...consultedSources,
    ]).slice(0, 8);

    const result: AnalysisResponse = {
      analysis: structured.analysis,
      confidence: structured.confidence,
      sources: mergedSources.length > 0 ? mergedSources : consultedSources,
      related_routes:
        structured.related_routes.length > 0
          ? structured.related_routes
          : routesForSources(mergedSources),
    };

    const audit_logged = await logAnalysisAudit({
      ownerId,
      question: normalized,
      sources: result.sources,
    });

    return {
      ...result,
      consulted_sources: consultedSources,
      audit_logged,
    };
  } catch (error) {
    throw mapOpenAiError(error);
  }
}
