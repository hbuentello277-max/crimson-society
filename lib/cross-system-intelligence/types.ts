import type { NexusActionType } from "@/lib/action-center/types";

export const CROSS_SYSTEM_INSIGHT_TYPES = [
  "risk",
  "opportunity",
  "correlation",
  "recommendation",
] as const;

export type CrossSystemInsightType = (typeof CROSS_SYSTEM_INSIGHT_TYPES)[number];

export const CROSS_SYSTEM_DOMAINS = [
  "revenue",
  "deployment",
  "membership",
  "credits",
  "founder",
  "shop",
  "platform",
] as const;

export type CrossSystemDomain = (typeof CROSS_SYSTEM_DOMAINS)[number];

export type CrossSystemAccess = "owner" | "admin";

export type CrossSystemSignal = {
  label: string;
  value: string;
  source: string;
  direction?: "up" | "down" | "flat" | "unknown";
};

export type CrossSystemCorrelation = {
  id: string;
  domain: CrossSystemDomain;
  title: string;
  summary: string;
  explanation: string;
  signals: CrossSystemSignal[];
  confidence_score: number;
  impact_score: number;
  related_routes: string[];
  generated_at: string;
};

export type CrossSystemTimelineCategory =
  | "deployment"
  | "revenue"
  | "membership"
  | "blackcard"
  | "report"
  | "founder_decision"
  | "incident"
  | "action_center"
  | "alert"
  | "platform";

export type CrossSystemTimelineEvent = {
  id: string;
  category: CrossSystemTimelineCategory;
  title: string;
  summary: string;
  occurred_at: string;
  source: string;
  severity?: "info" | "warning" | "critical";
  related_routes: string[];
};

export type CrossSystemInsight = {
  id: string;
  insight_type: CrossSystemInsightType;
  domain: CrossSystemDomain;
  title: string;
  summary: string;
  explanation: string;
  confidence_score: number;
  impact_score: number;
  related_routes: string[];
  suggested_action_type?: NexusActionType;
  generated_at: string;
};

export type CrossSystemRecommendation = {
  id: string;
  title: string;
  summary: string;
  reason: string;
  suggested_action_type: NexusActionType;
  source_insight_id: string;
  related_routes: string[];
  generated_at: string;
};

export type FounderIntelligenceBriefing = {
  generated_at: string;
  headline: string;
  narrative: string;
  top_risks: CrossSystemInsight[];
  top_opportunities: CrossSystemInsight[];
  top_correlations: CrossSystemCorrelation[];
  recommended_actions: CrossSystemRecommendation[];
  recent_events: CrossSystemTimelineEvent[];
  readOnly: true;
};

export type CrossSystemIntelligenceSummary = {
  collected_at: string;
  access: CrossSystemAccess;
  correlations: CrossSystemCorrelation[];
  timeline: CrossSystemTimelineEvent[];
  insights: CrossSystemInsight[];
  risks: CrossSystemInsight[];
  opportunities: CrossSystemInsight[];
  recommendations: CrossSystemRecommendation[];
  founder_briefing: FounderIntelligenceBriefing;
  readOnly: true;
  partial?: boolean;
  warnings?: string[];
};

export type CrossSystemTimelineWindow = "24h" | "7d" | "30d";
