export const NEXUS_MOBILE_COPILOT_PHASE = 15;

export type CopilotConversationRole = "founder" | "nexus";

export type CopilotConversationSource = "voice" | "typed" | "quick_action";

export type CopilotConversationEntry = {
  id: string;
  role: CopilotConversationRole;
  content: string;
  source: CopilotConversationSource;
  tool: string | null;
  createdAt: string;
};

export type MobileCopilotQuickActionKind = "voice" | "navigation";

export type MobileCopilotQuickAction = {
  id: string;
  label: string;
  kind: MobileCopilotQuickActionKind;
  transcript?: string;
  href?: string;
};

export type CopilotVoiceDisplayStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "waiting_for_follow_up"
  | "conversation_paused"
  | "transcribing"
  | "confirming"
  | "error";
