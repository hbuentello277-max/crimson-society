"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useNexusVoiceAssistant,
  type NexusVoiceAssistantState,
} from "@/hooks/admin/useNexusVoiceAssistant";

const NexusVoiceAssistantContext = createContext<NexusVoiceAssistantState | null>(null);

export function NexusVoiceAssistantProvider({ children }: { children: ReactNode }) {
  const voice = useNexusVoiceAssistant();
  return (
    <NexusVoiceAssistantContext.Provider value={voice}>{children}</NexusVoiceAssistantContext.Provider>
  );
}

export function useNexusVoiceAssistantContext() {
  const context = useContext(NexusVoiceAssistantContext);
  if (!context) {
    throw new Error("useNexusVoiceAssistantContext must be used within NexusVoiceAssistantProvider");
  }
  return context;
}

export function useOptionalNexusVoiceAssistantContext() {
  return useContext(NexusVoiceAssistantContext);
}
