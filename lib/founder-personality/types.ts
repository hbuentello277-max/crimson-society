export type FounderMode = "operator" | "founder" | "launch" | "growth";

export const FOUNDER_MODES: FounderMode[] = ["operator", "founder", "launch", "growth"];

export const DEFAULT_FOUNDER_MODE: FounderMode = "founder";

export type FounderStructuredResponse = {
  situation: string;
  risk: string;
  recommendation: string;
  nextAction: string;
  confidence?: string;
  impact?: string;
};

export type LaunchReadinessBreakdown = {
  ready: string[];
  atRisk: string[];
  blocked: string[];
  nextMilestone: string;
};

export type FounderMorningGuidance = {
  platformStatus: string;
  launchReadiness: string;
  biggestRisk: string;
  biggestOpportunity: string;
  recommendedFocusToday: string;
  topActions: string[];
};
