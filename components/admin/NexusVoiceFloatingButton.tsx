"use client";

import type { NexusVoiceAssistantState } from "@/hooks/admin/useNexusVoiceAssistant";

type NexusVoiceFloatingButtonProps = {
  voice: NexusVoiceAssistantState;
  className?: string;
};

function NexusGlyph() {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f1c3c7]">NEXUS</span>
  );
}

export function NexusVoiceFloatingButton({ voice, className = "" }: NexusVoiceFloatingButtonProps) {
  if (voice.open) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={voice.openPanel}
      aria-label="Open NEXUS Voice assistant"
      className={`fixed right-3 z-[9990] flex h-14 min-h-14 min-w-14 touch-manipulation items-center justify-center rounded-full border border-[#b4141e]/80 bg-[#12080a]/95 px-4 shadow-[0_0_32px_rgba(180,20,30,0.55),0_10px_28px_rgba(0,0,0,0.65)] backdrop-blur-md transition hover:border-[#b4141e] hover:bg-[#b4141e]/25 hover:shadow-[0_0_40px_rgba(180,20,30,0.65)] sm:right-4 ${className}`}
      style={{
        bottom: "max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
      }}
    >
      <NexusGlyph />
    </button>
  );
}
