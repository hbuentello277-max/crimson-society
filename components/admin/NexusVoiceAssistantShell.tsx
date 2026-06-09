"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NexusVoiceAssistantProvider } from "@/components/admin/NexusVoiceAssistantContext";
import { NexusVoiceFloatingButton } from "@/components/admin/NexusVoiceFloatingButton";
import { NexusVoicePanel } from "@/components/admin/NexusVoicePanel";
import { useNexusVoiceAssistantContext } from "@/components/admin/NexusVoiceAssistantContext";

type NexusVoiceChromeProps = {
  enabled: boolean;
  floatingClassName?: string;
};

function NexusVoiceChrome({ enabled, floatingClassName }: NexusVoiceChromeProps) {
  const voice = useNexusVoiceAssistantContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!enabled || !mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <NexusVoiceFloatingButton voice={voice} className={floatingClassName} />
      <NexusVoicePanel
        open={voice.open}
        status={voice.status}
        statusLabel={voice.statusLabel}
        transcript={voice.transcript}
        response={voice.response}
        error={voice.error}
        history={voice.history}
        pendingConfirmation={voice.pendingConfirmation}
        pendingNavigation={voice.pendingNavigation}
        recordingSupported={voice.recordingSupported}
        isListening={voice.isListening}
        isBusy={voice.isBusy}
        onClose={voice.closePanel}
        onConfirm={() => void voice.confirmPendingAction()}
        onCancel={voice.cancelConfirmation}
        onToggleListening={() => void voice.toggleListening()}
        onNavigate={voice.navigateTo}
        onSubmitTranscript={(value) => void voice.submitTranscript(value)}
      />
    </>,
    document.body,
  );
}

type NexusVoiceAssistantShellProps = {
  enabled: boolean;
  children: ReactNode;
  floatingClassName?: string;
};

export function NexusVoiceAssistantShell({
  enabled,
  children,
  floatingClassName,
}: NexusVoiceAssistantShellProps) {
  return (
    <NexusVoiceAssistantProvider>
      {children}
      <NexusVoiceChrome enabled={enabled} floatingClassName={floatingClassName} />
    </NexusVoiceAssistantProvider>
  );
}
