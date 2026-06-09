export const CHAT_MODES = ["status", "risk", "growth", "strategy", "historical", "general"] as const;

export type ChatMode = (typeof CHAT_MODES)[number];

export const CHAT_INTENTS = [
  "attention_today",
  "biggest_risk",
  "biggest_opportunity",
  "weekly_summary",
  "changes_since_last_week",
  "blackcard_performance",
  "mission_score",
  "nexus_recommendation",
  "mission_summary",
  "growth_forecast",
  "revenue_forecast",
  "recommended_focus",
  "open_incidents",
  "best_scenario",
  "memory_timeline",
  "platform_status",
  "unknown",
] as const;

export type ChatIntent = (typeof CHAT_INTENTS)[number];

export type ChatSource =
  | "Founder Dashboard"
  | "Reports"
  | "Briefings"
  | "Intelligence"
  | "Memory"
  | "Correlations"
  | "Planning"
  | "Forecasting"
  | "Copilot"
  | "Operational Intelligence"
  | "Platform Status"
  | "Decision Engine"
  | "Scenarios"
  | "Alerts"
  | "Incidents"
  | "Commands";

export type ChatAnswer = {
  answer: string;
  sources: ChatSource[];
  related_routes: string[];
  confidence: number;
};

export type ChatRouteResult = {
  mode: ChatMode;
  intent: ChatIntent;
  match_confidence: number;
};

export type ChatRequest = {
  message: string;
};

export type ChatResponse = ChatAnswer & {
  ok: true;
  mode: ChatMode;
  intent: ChatIntent;
};
