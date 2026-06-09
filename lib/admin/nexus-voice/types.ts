export const NEXUS_VOICE_TOOLS = [
  "getMemberCount",
  "getBlackcardCount",
  "getRecentSignups",
  "getPendingReports",
  "getRevenueToday",
  "getSystemStatus",
] as const;

export type NexusVoiceToolName = (typeof NEXUS_VOICE_TOOLS)[number];

export type NexusVoiceActionResult = {
  tool: NexusVoiceToolName;
  data: Record<string, unknown>;
};

export type NexusVoiceAssistantResult = {
  transcript: string;
  response: string;
  actionResult?: NexusVoiceActionResult;
  tool?: NexusVoiceToolName | null;
};

export type NexusVoiceStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error";
