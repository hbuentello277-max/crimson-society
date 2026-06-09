import type { NexusVoiceAssistantResult, NexusVoiceNavigationAction } from "@/lib/admin/nexus-voice/types";

export const NEXUS_VOICE_CONVERSATION_MODE_KEY = "nexus-voice-conversation-mode-v1";

export type NexusVoiceConversationControl =
  | "start_mode"
  | "stop_mode"
  | "end_conversation"
  | "pause_listening"
  | "resume_listening";

export type NexusVoiceSessionContext = {
  lastTranscript: string;
  lastResponse: string;
  lastTool: string | null;
  lastNavigation: NexusVoiceNavigationAction | null;
  lastFounderRecommendation: string | null;
  lastBlocker: string | null;
  lastActionItem: string | null;
};

export const EMPTY_NEXUS_VOICE_SESSION_CONTEXT: NexusVoiceSessionContext = {
  lastTranscript: "",
  lastResponse: "",
  lastTool: null,
  lastNavigation: null,
  lastFounderRecommendation: null,
  lastBlocker: null,
  lastActionItem: null,
};

export function readConversationModePreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(NEXUS_VOICE_CONVERSATION_MODE_KEY) === "on";
}

export function writeConversationModePreference(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(NEXUS_VOICE_CONVERSATION_MODE_KEY, enabled ? "on" : "off");
}

export function resolveConversationControlCommand(
  transcript: string,
): NexusVoiceConversationControl | null {
  const normalized = transcript.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    /\b(start|enable|turn on)\b.*\bconversation mode\b/i.test(normalized) ||
    normalized === "start conversation mode"
  ) {
    return "start_mode";
  }

  if (
    /\b(stop|disable|turn off)\b.*\bconversation mode\b/i.test(normalized) ||
    normalized === "stop conversation mode"
  ) {
    return "stop_mode";
  }

  if (/\bend conversation\b/i.test(normalized)) {
    return "end_conversation";
  }

  if (/\bpause listening\b/i.test(normalized)) {
    return "pause_listening";
  }

  if (/\bresume listening\b/i.test(normalized)) {
    return "resume_listening";
  }

  return null;
}

const FOLLOW_UP_PATTERNS: RegExp[] = [
  /^open (that|it)$/i,
  /^go (there|to that)$/i,
  /^tell me more$/i,
  /^what about launch\??$/i,
  /^save that as a blocker$/i,
  /^mark (that|it) (as )?completed$/i,
  /^mark (that|it) complete$/i,
];

export function isFollowUpPhrase(transcript: string): boolean {
  const normalized = transcript.trim();
  if (!normalized) {
    return false;
  }
  return FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(normalized));
}

function navigationCommandFromContext(
  navigation: NexusVoiceNavigationAction | null,
): string | null {
  if (!navigation?.label) {
    return null;
  }
  return `open ${navigation.label}`;
}

function recommendationFromData(data: Record<string, unknown> | undefined): string | null {
  if (!data) {
    return null;
  }

  const recommended = data.recommendedNextAction as { title?: string } | null | undefined;
  if (recommended?.title) {
    return recommended.title;
  }

  const focus = data.focus as Array<{ title?: string }> | undefined;
  if (focus?.[0]?.title) {
    return focus[0].title;
  }

  const topRisk = data.topRisk as { title?: string } | null | undefined;
  if (topRisk?.title) {
    return topRisk.title;
  }

  return null;
}

function blockerFromData(data: Record<string, unknown> | undefined): string | null {
  if (!data) {
    return null;
  }

  const launchBlockers = data.launchBlockers as string[] | undefined;
  if (launchBlockers?.[0]) {
    return launchBlockers[0];
  }

  const blockers = data.blockers as string[] | undefined;
  if (blockers?.[0]) {
    return blockers[0];
  }

  return null;
}

export function buildSessionContextFromResult(
  transcript: string,
  result: NexusVoiceAssistantResult,
  previous: NexusVoiceSessionContext | null = null,
): NexusVoiceSessionContext {
  const data = result.actionResult?.data;
  const recommendation =
    recommendationFromData(data) ?? previous?.lastFounderRecommendation ?? null;
  const blocker = blockerFromData(data) ?? previous?.lastBlocker ?? null;

  return {
    lastTranscript: transcript,
    lastResponse: result.response,
    lastTool: result.navigation ? "navigate" : (result.tool ?? null),
    lastNavigation: result.navigation ?? null,
    lastFounderRecommendation: recommendation,
    lastBlocker: blocker,
    lastActionItem: recommendation ?? previous?.lastActionItem ?? null,
  };
}

export function resolveFollowUpTranscript(
  transcript: string,
  context: NexusVoiceSessionContext | null | undefined,
): string {
  const normalized = transcript.trim();
  if (!normalized || !context) {
    return normalized;
  }

  if (/^open (that|it)$/i.test(normalized) || /^go (there|to that)$/i.test(normalized)) {
    const navigationCommand = navigationCommandFromContext(context.lastNavigation);
    if (navigationCommand) {
      return navigationCommand;
    }
  }

  if (/^tell me more$/i.test(normalized)) {
    if (context.lastTool === "getFounderRecommendations") {
      return "founder recommendations";
    }
    if (context.lastTool === "getMorningBriefing") {
      return "morning briefing";
    }
    if (context.lastTool === "getFounderBriefing") {
      return "founder briefing";
    }
    if (context.lastTool === "answerFounderQuestion") {
      return context.lastTranscript || "what should I focus on today";
    }
    if (context.lastTranscript) {
      return context.lastTranscript;
    }
  }

  if (/what about launch/i.test(normalized)) {
    return "what is blocking launch";
  }

  if (/save that as a blocker/i.test(normalized)) {
    const blocker =
      context.lastBlocker ||
      context.lastFounderRecommendation ||
      context.lastResponse.slice(0, 120);
    return `create admin briefing title "${blocker}"`;
  }

  if (/mark (that|it)/i.test(normalized) && /complet/i.test(normalized)) {
    const item = context.lastActionItem || context.lastFounderRecommendation;
    if (item) {
      return `prepare observation draft title "Completed: ${item}"`;
    }
  }

  return normalized;
}

export type ConversationResumeDecision = {
  shouldResumeListening: boolean;
  nextStatus: "idle" | "listening_followup";
  reason: string;
};

export function shouldResumeConversationListening(input: {
  conversationModeEnabled: boolean;
  conversationActive: boolean;
  conversationPaused: boolean;
  transcriptionUnavailable: boolean;
  recordingSupported: boolean;
  hadError: boolean;
  requiresConfirmation: boolean;
}): ConversationResumeDecision {
  if (input.requiresConfirmation) {
    return {
      shouldResumeListening: false,
      nextStatus: "idle",
      reason: "confirmation_required",
    };
  }

  if (input.hadError) {
    return {
      shouldResumeListening: false,
      nextStatus: "idle",
      reason: "error",
    };
  }

  if (!input.conversationModeEnabled || !input.conversationActive || input.conversationPaused) {
    return {
      shouldResumeListening: false,
      nextStatus: "idle",
      reason: "conversation_inactive",
    };
  }

  if (input.transcriptionUnavailable || !input.recordingSupported) {
    return {
      shouldResumeListening: false,
      nextStatus: "listening_followup",
      reason: "typed_followup",
    };
  }

  return {
    shouldResumeListening: true,
    nextStatus: "listening_followup",
    reason: "voice_followup",
  };
}

export function formatConversationControlResponse(
  command: NexusVoiceConversationControl,
): string {
  switch (command) {
    case "start_mode":
      return "Conversation mode is on. I will listen for follow-ups after each response.";
    case "stop_mode":
      return "Conversation mode is off.";
    case "end_conversation":
      return "Conversation ended.";
    case "pause_listening":
      return "Listening paused. Say resume listening or type a follow-up when ready.";
    case "resume_listening":
      return "Listening resumed.";
    default:
      return "Conversation updated.";
  }
}
