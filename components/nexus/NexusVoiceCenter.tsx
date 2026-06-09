"use client";

import { useEffect } from "react";
import { NexusVoicePanel } from "@/components/admin/NexusVoicePanel";
import { useNexusVoiceAssistantContext } from "@/components/admin/NexusVoiceAssistantContext";
import { NexusCommandFrame, NexusSectionFrame } from "@/components/nexus/NexusShared";
import { listVoiceCommandExamples } from "@/lib/nexus/voice-commands";

export function NexusVoiceCenter() {
  const voice = useNexusVoiceAssistantContext();
  const commandExamples = listVoiceCommandExamples();

  useEffect(() => {
    voice.openPanel();
  }, [voice.openPanel]);

  return (
    <NexusSectionFrame
      title="Voice Assistant"
      description="Unified NEXUS voice for navigation, monitoring, operator briefings, and confirmed actions."
      loading={false}
      error={null}
      onRefresh={async () => {
        voice.closePanel();
        voice.openPanel();
      }}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-[#b4141e]/35 bg-[#0a0608]/90 px-4 py-3 text-sm text-[#f1c3c7]">
          <p className="font-medium">Unified NEXUS Voice</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Use the microphone for voice commands or type below. Navigation opens pages without
            confirmation. Write actions still require your approval.
          </p>
        </div>

        <NexusVoicePanel
          open
          variant="page"
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

        <NexusCommandFrame className="p-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">
            Supported navigation commands
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {commandExamples.map((command) => (
              <li
                key={command.href}
                className="rounded-md border border-[#b4141e]/15 bg-[#080506]/80 px-3 py-2 text-xs text-zinc-300"
              >
                <span className="text-[#f1c3c7]">&ldquo;{command.example}&rdquo;</span>
                <span className="mt-1 block text-zinc-500">→ {command.label}</span>
              </li>
            ))}
          </ul>
        </NexusCommandFrame>
      </div>
    </NexusSectionFrame>
  );
}
