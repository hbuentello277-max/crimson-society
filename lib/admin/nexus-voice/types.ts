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
  "createFounderMemoryDraft",
] as const;

/** Owner-only confirmed writes (founder memory capture). */
export const NEXUS_VOICE_OWNER_CONFIRM_TOOLS = ["createFounderMemoryDraft"] as const;

export const NEXUS_VOICE_FOUNDER_TOOLS = [
  "getFounderBriefing",
  "getMorningBriefing",
  "getFounderRecommendations",
  "getFounderTimeline",
  "queryFounderMemory",
  "answerFounderQuestion",
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
] as const;

export type NexusVoicePhase2ToolName = (typeof NEXUS_VOICE_PHASE2_TOOLS)[number];
export type NexusVoiceActionReadToolName = (typeof NEXUS_VOICE_ACTION_READ_TOOLS)[number];
export type NexusVoiceConfirmToolName = (typeof NEXUS_VOICE_CONFIRM_TOOLS)[number];
export type NexusVoiceMonitoringToolName = (typeof NEXUS_VOICE_MONITORING_TOOLS)[number];
export type NexusVoiceFounderToolName = (typeof NEXUS_VOICE_FOUNDER_TOOLS)[number];
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

export function isNexusVoiceOwnerConfirmTool(tool: string): boolean {
  return (NEXUS_VOICE_OWNER_CONFIRM_TOOLS as readonly string[]).includes(tool);
}
