export const COPILOT_URGENCIES = ["critical", "high", "medium", "low"] as const;

export type CopilotUrgency = (typeof COPILOT_URGENCIES)[number];

export const COPILOT_SEVERITIES = ["critical", "high", "medium", "low"] as const;

export type CopilotSeverity = (typeof COPILOT_SEVERITIES)[number];

export type DailyFocusItem = {
  id: string;
  title: string;
  reason: string;
  urgency: CopilotUrgency;
  related_route: string;
};

export type CopilotOpportunity = {
  title: string;
  summary: string;
  recommendation: string;
  confidence_score: number;
  impact_score: number;
  related_route: string;
};

export type CopilotRisk = {
  title: string;
  summary: string;
  recommendation: string;
  severity: CopilotSeverity;
  related_route: string;
};

export type CopilotSignal = {
  id: string;
  label: string;
  summary: string;
  source: string;
};

export type FounderGuidanceBrief = {
  overall_status: string;
  primary_focus: string;
  secondary_focus: string;
  largest_opportunity: string;
  largest_risk: string;
  recommended_next_step: string;
};

export type CopilotSummary = {
  generated_at: string;
  guidance: FounderGuidanceBrief;
  daily_focus: DailyFocusItem[];
  top_opportunity: CopilotOpportunity | null;
  top_risk: CopilotRisk | null;
  improving_signals: CopilotSignal[];
  declining_signals: CopilotSignal[];
  recommended_next_steps: string[];
};

export type CopilotOpportunityCandidate = CopilotOpportunity & {
  score: number;
  id: string;
};

export type CopilotRiskCandidate = CopilotRisk & {
  score: number;
  id: string;
};
