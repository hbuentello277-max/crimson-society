import type { NexusVoiceStatus } from "@/lib/admin/nexus-voice/types";
import type { CopilotVoiceDisplayStatus } from "@/lib/mobile-copilot/types";

export function resolveCopilotVoiceDisplayStatus(input: {
  status: NexusVoiceStatus;
  conversationPaused: boolean;
  awaitingFollowUp: boolean;
}): CopilotVoiceDisplayStatus {
  if (input.conversationPaused) {
    return "conversation_paused";
  }

  if (input.awaitingFollowUp && input.status === "idle") {
    return "waiting_for_follow_up";
  }

  if (input.status === "idle") {
    return "idle";
  }

  return input.status;
}

export function copilotVoiceStatusLabel(status: CopilotVoiceDisplayStatus): string {
  switch (status) {
    case "listening":
      return "Listening";
    case "transcribing":
      return "Thinking";
    case "thinking":
      return "Thinking";
    case "speaking":
      return "Speaking";
    case "waiting_for_follow_up":
      return "Waiting for follow-up";
    case "conversation_paused":
      return "Conversation paused";
    case "confirming":
      return "Awaiting confirmation";
    case "error":
      return "Error";
    default:
      return "Ready";
  }
}
