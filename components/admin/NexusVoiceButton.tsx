"use client";

import { NexusVoicePanel } from "@/components/admin/NexusVoicePanel";
import { useNexusVoiceAssistant } from "@/hooks/admin/useNexusVoiceAssistant";

type NexusVoiceButtonProps = {
  enabled: boolean;
};

function MicGlyph({ active }: { active: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
      {active ? (
        <circle cx="12" cy="12" r="10" className="fill-none stroke-current" strokeWidth="1.5" />
      ) : null}
    </svg>
  );
}

export function NexusVoiceButton({ enabled }: NexusVoiceButtonProps) {
  const voice = useNexusVoiceAssistant();

  if (!enabled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void voice.toggleListening()}
        disabled={voice.isBusy && !voice.isListening}
        aria-pressed={voice.isListening}
        aria-label="NEXUS Voice"
        className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em] transition sm:w-auto ${
          voice.isListening
            ? "border-[#b4141e]/80 bg-[#b4141e]/30 text-[#f1c3c7] shadow-[0_0_20px_rgba(180,20,30,0.35)]"
            : "border-[#b4141e]/40 bg-[#b4141e]/10 text-[#f1c3c7] hover:border-[#b4141e]/70 hover:bg-[#b4141e]/20"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <MicGlyph active={voice.isListening} />
        <span>NEXUS Voice</span>
      </button>

      <NexusVoicePanel
        open={voice.open}
        status={voice.status}
        statusLabel={voice.statusLabel}
        transcript={voice.transcript}
        response={voice.response}
        error={voice.error}
        history={voice.history}
        pendingConfirmation={voice.pendingConfirmation}
        onClose={voice.closePanel}
        onConfirm={() => void voice.confirmPendingAction()}
        onCancel={voice.cancelConfirmation}
      />
    </>
  );
}
