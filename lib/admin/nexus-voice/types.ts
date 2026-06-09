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
] as const;

export const NEXUS_VOICE_FOUNDER_TOOLS = [
  "getFounderBriefing",
  "getMorningBriefing",
  "getFounderRecommendations",
  "getFounderTimeline",
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
  sessionContext?: import("@/lib/admin/nexus-voice/conversation").NexusVoiceSessionContext;
  resolvedTranscript?: string;
  founderMode?: import("@/lib/founder-personality/types").FounderMode;
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
  | "listening_followup"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "confirming"
  | "conversation_paused"
  | "error";

export type { NexusVoiceSessionContext } from "@/lib/admin/nexus-voice/conversation";

export function isNexusVoiceConfirmTool(tool: string): tool is NexusVoiceConfirmToolName {
  return (NEXUS_VOICE_CONFIRM_TOOLS as readonly string[]).includes(tool);
}
