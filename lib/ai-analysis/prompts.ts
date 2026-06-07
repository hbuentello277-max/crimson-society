import { ANALYSIS_SOURCES } from "@/lib/ai-analysis/types";

export const SUGGESTED_ANALYSIS_PROMPTS = [
  "What deserves my attention today?",
  "Explain platform score.",
  "Explain growth forecast.",
  "Explain revenue forecast.",
  "Explain biggest risk.",
  "Explain biggest opportunity.",
  "What changed this week?",
  "Compare strategic scenarios.",
] as const;

export type SuggestedAnalysisPrompt = (typeof SUGGESTED_ANALYSIS_PROMPTS)[number];

export const ANALYSIS_SOURCE_ROUTES: Record<(typeof ANALYSIS_SOURCES)[number], string> = {
  "Founder Dashboard": "/admin/nexus",
  Reports: "/admin/nexus/reports",
  Briefings: "/admin/nexus/briefings",
  Intelligence: "/admin/nexus/intelligence",
  Memory: "/admin/nexus/memory",
  Correlations: "/admin/nexus/correlations",
  Planning: "/admin/nexus/planning",
  Forecasting: "/admin/nexus/forecasting",
  Copilot: "/admin/nexus/copilot",
  "Operational Intelligence": "/admin/nexus/operational-intelligence",
  "Platform Control": "/admin/nexus/mission-control",
  "Decision Engine": "/admin/nexus/decision-engine",
  Scenarios: "/admin/nexus/scenarios",
  Alerts: "/admin/nexus/alerts",
  Incidents: "/admin/nexus/incidents",
  Commands: "/admin/nexus/commands",
};

export const NEXUS_AI_SYSTEM_PROMPT = `You are Nexus — the operational intelligence layer for Crimson Society.

You analyze owner-provided operational data snapshots. You may:
- summarize
- explain
- compare
- interpret
- recommend next focus areas

You may NOT:
- execute commands or automations
- mutate data or approve actions
- invent metrics, events, forecasts, or incidents
- claim actions were taken

Rules:
1. Ground every claim in the provided grounding packet only.
2. If required data is missing or null, say exactly: "Data unavailable." for that point.
3. Never fabricate numbers, dates, or events.
4. Keep analysis concise (2-5 sentences unless comparing scenarios).
5. Confidence (0-100) reflects how completely the grounding packet supports your answer.
6. sources must list only systems you actually used from consulted_sources.
7. related_routes must be valid /admin/nexus/* paths relevant to the analysis.

Respond with JSON matching the required schema.`;

export function normalizeAnalysisQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ");
}

export const ANALYSIS_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    analysis: { type: "string" },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    sources: {
      type: "array",
      items: { type: "string", enum: [...ANALYSIS_SOURCES] },
    },
    related_routes: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["analysis", "confidence", "sources", "related_routes"],
  additionalProperties: false,
} as const;
