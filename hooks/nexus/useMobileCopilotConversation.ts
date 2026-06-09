"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNexusVoiceAssistantContext } from "@/components/admin/NexusVoiceAssistantContext";
import {
  appendCopilotConversation,
  readCopilotConversation,
} from "@/lib/mobile-copilot/conversation-storage";
import type { CopilotConversationEntry, CopilotConversationSource } from "@/lib/mobile-copilot/types";
import {
  copilotVoiceStatusLabel,
  resolveCopilotVoiceDisplayStatus,
} from "@/lib/mobile-copilot/voice-status";

export function useMobileCopilotConversation() {
  const voice = useNexusVoiceAssistantContext();
  const [conversation, setConversation] = useState<CopilotConversationEntry[]>(() =>
    typeof window === "undefined" ? [] : readCopilotConversation(),
  );
  const [awaitingFollowUp, setAwaitingFollowUp] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const pendingSourceRef = useRef<CopilotConversationSource>("voice");
  const lastRecordedKeyRef = useRef("");
  const previousStatusRef = useRef(voice.status);

  const refreshConversation = useCallback(() => {
    setConversation(readCopilotConversation());
  }, []);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = voice.status;

    const completed =
      (previousStatus === "thinking" || previousStatus === "transcribing") &&
      (voice.status === "idle" ||
        voice.status === "confirming" ||
        voice.status === "error" ||
        voice.status === "speaking");

    if (!completed) {
      return;
    }

    const transcript = voice.transcript.trim();
    const response = voice.response.trim();
    const recordKey = `${transcript}::${response}`;
    if (!transcript && !response) {
      return;
    }
    if (recordKey === lastRecordedKeyRef.current) {
      return;
    }

    lastRecordedKeyRef.current = recordKey;
    const source = pendingSourceRef.current;
    pendingSourceRef.current = "voice";

    if (transcript) {
      appendCopilotConversation({
        role: "founder",
        content: transcript,
        source,
        tool: voice.pendingNavigation ? "navigate" : null,
      });
    }

    if (response) {
      appendCopilotConversation({
        role: "nexus",
        content: response,
        source,
        tool: voice.pendingNavigation ? "navigate" : null,
      });
    }

    refreshConversation();
  }, [
    refreshConversation,
    voice.pendingNavigation,
    voice.response,
    voice.status,
    voice.transcript,
  ]);

  useEffect(() => {
    if (voice.status === "speaking" || voice.status === "thinking" || voice.status === "transcribing") {
      setAwaitingFollowUp(false);
      return;
    }

    if (
      voice.status === "idle" &&
      !voice.conversationPaused &&
      !voice.isListening &&
      voice.response.trim().length > 0
    ) {
      setAwaitingFollowUp(true);
    }
  }, [voice.conversationPaused, voice.isListening, voice.response, voice.status]);

  const submitTypedMessage = useCallback(
    async (value?: string) => {
      const message = (value ?? typedInput).trim();
      if (!message) {
        return;
      }

      setAwaitingFollowUp(false);
      pendingSourceRef.current = "typed";
      setTypedInput("");
      await voice.submitTranscript(message);
    },
    [typedInput, voice],
  );

  const runQuickAction = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed) {
        return;
      }

      setAwaitingFollowUp(false);
      pendingSourceRef.current = "quick_action";
      await voice.submitTranscript(trimmed);
    },
    [voice],
  );

  const displayStatus = resolveCopilotVoiceDisplayStatus({
    status: voice.status,
    conversationPaused: voice.conversationPaused,
    awaitingFollowUp,
  });

  return {
    conversation,
    typedInput,
    setTypedInput,
    submitTypedMessage,
    runQuickAction,
    displayStatus,
    statusLabel: copilotVoiceStatusLabel(displayStatus),
    awaitingFollowUp,
    voice,
  };
}
