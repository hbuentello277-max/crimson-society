"use client";

/**
 * @deprecated Use NexusVoiceAssistantShell with NexusVoiceFloatingButton instead.
 */
import { NexusVoiceAssistantShell } from "@/components/admin/NexusVoiceAssistantShell";

type NexusVoiceButtonProps = {
  enabled: boolean;
  children?: React.ReactNode;
};

export function NexusVoiceButton({ enabled, children }: NexusVoiceButtonProps) {
  return <NexusVoiceAssistantShell enabled={enabled}>{children}</NexusVoiceAssistantShell>;
}
