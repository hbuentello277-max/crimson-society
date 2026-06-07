import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { loadAnalysisContext } from "@/lib/ai-analysis/context";
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

const DEFAULT_MODEL = "o4-mini";

function resolveModel(): string {
  return process.env.OPENAI_NEXUS_MODEL?.trim() || DEFAULT_MODEL;
}

function resolveOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

function routesForSources(sources: AnalysisSource[]): string[] {
  return sources
    .map((source) => ANALYSIS_SOURCE_ROUTES[source])
    .filter((route): route is string => Boolean(route));
}

function parseStructuredOutput(raw: string): StructuredAnalysisOutput {
  const parsed = JSON.parse(raw) as Partial<StructuredAnalysisOutput>;

  if (typeof parsed.analysis !== "string" || !parsed.analysis.trim()) {
    throw new Error("AI response missing analysis text.");
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
}

async function logAnalysisAudit(input: {
  ownerId: string;
  question: string;
  sources: AnalysisSource[];
}): Promise<void> {
  const admin = createNexusServiceClient();
  const { error } = await admin.from("nexus_ai_analysis_log").insert({
    owner_id: input.ownerId,
    question: input.question,
    sources_consulted: input.sources,
  });

  if (error) {
    console.error("Failed to write nexus_ai_analysis_log:", error.message);
  }
}

export function getNexusAiModel(): string {
  return resolveModel();
}

export async function runNexusAiAnalysis(
  supabase: SupabaseClient,
  ownerId: string,
  question: string,
): Promise<AnalysisResponse & { consulted_sources: AnalysisSource[] }> {
  const normalized = normalizeAnalysisQuestion(question);
  if (!normalized) {
    throw new Error("question is required.");
  }

  const consultedSources = selectConsultedSources(normalized);
  const context = await loadAnalysisContext(supabase);
  const grounding = buildGroundingPacket(context, consultedSources);

  const client = resolveOpenAIClient();
  const model = resolveModel();

  const userInput = [
    `Owner question: ${normalized}`,
    "",
    "Grounding packet (JSON):",
    JSON.stringify(grounding),
    "",
    `Consulted sources for this request: ${consultedSources.join(", ")}`,
    "Only cite facts present in the grounding packet.",
  ].join("\n");

  const response = await client.responses.create({
    model,
    instructions: NEXUS_AI_SYSTEM_PROMPT,
    input: userInput,
    text: {
      format: {
        type: "json_schema",
        name: "nexus_analysis",
        strict: true,
        schema: ANALYSIS_OUTPUT_JSON_SCHEMA,
      },
    },
  });

  const rawOutput = response.output_text?.trim();
  if (!rawOutput) {
    throw new Error("AI returned an empty analysis.");
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

  await logAnalysisAudit({
    ownerId,
    question: normalized,
    sources: result.sources,
  });

  return {
    ...result,
    consulted_sources: consultedSources,
  };
}
