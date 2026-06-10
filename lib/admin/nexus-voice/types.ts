export const NEXUS_VOICE_PHASE2_TOOLS = [
  "getMemberCount",
  "getBlackcardCount",
  "getRecentSignups",
  "getPendingReports",
  "getRevenueToday",
  "getSystemStatus",
] as const;

export const NEXUS_VOICE_ACTION_READ_TOOLS = [
  "getOrdersNeedingPickup",
  "getFailedMediaJobs",
  "summarizePendingReports",
] as const;

export const NEXUS_VOICE_CONFIRM_TOOLS = [
  "createSystemAlertDraft",
  "createAdminBriefingDraft",
  "createRunbookDraft",
  "createNexusObservationDraft",
  "prepareAutomationRuleDraft",
  "updateAutomationRuleStatus",
] as const;

export const NEXUS_VOICE_AUTOMATION_STUDIO_TOOLS = ["getAutomationTriggered"] as const;

export const NEXUS_VOICE_FOUNDER_TOOLS = [
  "getFounderBriefing",
  "getMorningBriefing",
  "getFounderRecommendations",
  "getFounderTimeline",
  "answerFounderQuestion",
] as const;

export const NEXUS_VOICE_EXECUTIVE_TOOLS = [
  "getExecutiveSummary",
  "getExecutivePriorities",
  "getExecutiveBiggestRisk",
  "getExecutiveBiggestOpportunity",
] as const;

export const NEXUS_VOICE_ACTION_CENTER_TOOLS = [
  "prepareNexusActionDraft",
  "prepareIntelligenceActionDraft",
  "getNexusActionQueue",
] as const;

export const NEXUS_VOICE_OPERATIONS_PLANNER_TOOLS = [
  "generateOperationsPlan",
  "createOperationsPlanActionDrafts",
] as const;

export const NEXUS_VOICE_CROSS_SYSTEM_TOOLS = [
  "getPlatformIntelligenceBriefing",
  "getPlatformIntelligenceTimeline",
  "getPlatformIntelligenceRisks",
  "getPlatformIntelligenceOpportunities",
] as const;

export const NEXUS_VOICE_MONITORING_TOOLS = [
  "getNexusSystemHealth",
  "getCheckoutHealth",
  "getSignupHealth",
  "getMediaProcessingHealth",
  "getPushNotificationHealth",
  "getCronHealth",
  "getPlatformJobsHealth",
  "getNexusLastRun",
  "getFailedPlatformJobs",
  "getRevenueRiskSummary",
  "getBlackcardConversionSummary",
  "getDailyOperatorBriefing",
] as const;

export const NEXUS_VOICE_TOOLS = [
  ...NEXUS_VOICE_PHASE2_TOOLS,
  ...NEXUS_VOICE_ACTION_READ_TOOLS,
  ...NEXUS_VOICE_CONFIRM_TOOLS,
  ...NEXUS_VOICE_MONITORING_TOOLS,
  ...NEXUS_VOICE_FOUNDER_TOOLS,
  ...NEXUS_VOICE_EXECUTIVE_TOOLS,
  ...NEXUS_VOICE_CROSS_SYSTEM_TOOLS,
  ...NEXUS_VOICE_OPERATIONS_PLANNER_TOOLS,
  ...NEXUS_VOICE_ACTION_CENTER_TOOLS,
  ...NEXUS_VOICE_AUTOMATION_STUDIO_TOOLS,
] as const;

export type NexusVoicePhase2ToolName = (typeof NEXUS_VOICE_PHASE2_TOOLS)[number];
export type NexusVoiceActionReadToolName = (typeof NEXUS_VOICE_ACTION_READ_TOOLS)[number];
export type NexusVoiceConfirmToolName = (typeof NEXUS_VOICE_CONFIRM_TOOLS)[number];
export type NexusVoiceMonitoringToolName = (typeof NEXUS_VOICE_MONITORING_TOOLS)[number];
export type NexusVoiceFounderToolName = (typeof NEXUS_VOICE_FOUNDER_TOOLS)[number];
export type NexusVoiceExecutiveToolName = (typeof NEXUS_VOICE_EXECUTIVE_TOOLS)[number];
export type NexusVoiceActionCenterToolName = (typeof NEXUS_VOICE_ACTION_CENTER_TOOLS)[number];
export type NexusVoiceCrossSystemToolName = (typeof NEXUS_VOICE_CROSS_SYSTEM_TOOLS)[number];
export type NexusVoiceOperationsPlannerToolName =
  (typeof NEXUS_VOICE_OPERATIONS_PLANNER_TOOLS)[number];
export type NexusVoiceAutomationStudioToolName =
  (typeof NEXUS_VOICE_AUTOMATION_STUDIO_TOOLS)[number];
export type NexusVoiceToolName = (typeof NEXUS_VOICE_TOOLS)[number];

export type NexusVoiceActionResult = {
  tool: NexusVoiceToolName;
  data: Record<string, unknown>;
  partial?: boolean;
  warnings?: string[];
};

export type NexusVoicePendingConfirmation = {
  token: string;
  tool: NexusVoiceConfirmToolName;
  label: string;
  summary: string;
  details: Record<string, unknown>;
  expiresAt: string;
};

export type NexusVoiceNavigationAction = {
  href: string;
  label: string;
};

export type NexusVoiceAssistantResult = {
  transcript: string;
  response: string;
  actionResult?: NexusVoiceActionResult;
  tool?: NexusVoiceToolName | null;
  pendingConfirmation?: NexusVoicePendingConfirmation;
  requiresConfirmation?: boolean;
  navigation?: NexusVoiceNavigationAction;
};

export type NexusVoiceConfirmResult = {
  success: boolean;
  response: string;
  tool: NexusVoiceConfirmToolName;
  actionResult?: NexusVoiceActionResult;
  error?: string;
};

export type NexusVoiceStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "confirming"
  | "error";

export function isNexusVoiceConfirmTool(tool: string): tool is NexusVoiceConfirmToolName {
  return (NEXUS_VOICE_CONFIRM_TOOLS as readonly string[]).includes(tool);
}
