export type ProactiveAlertSeverity = "info" | "warning" | "critical";

export type ProactiveAlertCategory =
  | "failed_jobs"
  | "revenue_drop"
  | "checkout"
  | "membership"
  | "media_queue"
  | "push_failure"
  | "platform_health"
  | "incident"
  | "alert";

export type ProactiveAlert = {
  id: string;
  category: ProactiveAlertCategory;
  severity: ProactiveAlertSeverity;
  title: string;
  summary: string;
  detectedAt: string;
  relatedRoute: string;
};

export type LaunchReadinessStatus = "not_ready" | "approaching" | "ready" | "strong";

export type LaunchReadinessFactors = {
  platformHealth: number;
  openIncidents: number;
  failedJobs: number;
  appStoreReadiness: number;
  betaFeedback: number;
  operationalStability: number;
};

export type LaunchReadinessBreakdown = {
  ready: string[];
  atRisk: string[];
  blocked: string[];
  nextMilestone: string;
};

export type LaunchReadiness = {
  score: number;
  status: LaunchReadinessStatus;
  factors: LaunchReadinessFactors;
  blockers: string[];
  summary: string;
  breakdown?: LaunchReadinessBreakdown;
};

export type FounderMorningGuidance = {
  platformStatus: string;
  launchReadiness: string;
  biggestRisk: string;
  biggestOpportunity: string;
  recommendedFocusToday: string;
  topActions: string[];
};

export type FounderPriorityType = "issue" | "opportunity" | "action";

export type FounderPriorityItem = {
  id: string;
  rank: number;
  type: FounderPriorityType;
  title: string;
  reason: string;
  urgency: "critical" | "high" | "medium" | "low";
  relatedRoute: string;
};

export type FounderPriorityEngine = {
  generatedAt: string;
  highestPriorityIssue: FounderPriorityItem | null;
  highestOpportunity: FounderPriorityItem | null;
  recommendedNextAction: FounderPriorityItem | null;
  estimatedLaunchReadiness: LaunchReadiness;
  rankedItems: FounderPriorityItem[];
};

export type MorningBriefingSection = {
  label: string;
  value: string;
  status?: "healthy" | "warning" | "critical" | "neutral";
};

export type MorningBriefing = {
  generatedAt: string;
  headline: string;
  sections: MorningBriefingSection[];
  proactiveAlerts: ProactiveAlert[];
  priority: FounderPriorityEngine;
  launchReadiness: LaunchReadiness;
  recommendedActions: string[];
  founderGuidance?: FounderMorningGuidance;
  readOnly: true;
  partial?: boolean;
  warnings?: string[];
};

export type WelcomeBriefing = {
  generatedAt: string;
  greeting: string;
  whatChanged: string[];
  needsAttention: string[];
  recommendedActions: string[];
  launchReadinessScore: number;
  readOnly: true;
};

export type ProactiveIntelligenceSummary = {
  generatedAt: string;
  morningBriefing: MorningBriefing;
  welcomeBriefing: WelcomeBriefing;
  proactiveAlerts: ProactiveAlert[];
  priority: FounderPriorityEngine;
  launchReadiness: LaunchReadiness;
  readOnly: true;
  partial?: boolean;
  warnings?: string[];
};
