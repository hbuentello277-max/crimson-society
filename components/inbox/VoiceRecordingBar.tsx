"use client";

import { useEffect, useState } from "react";
import { IconMicrophone } from "@/components/inbox/inbox-icons";
import { CS_CTA_PRIMARY_SM, CS_BTN_SECONDARY } from "@/lib/crimson-accent";
import {
  DM_VOICE_MAX_SECONDS,
  formatVoiceTimer,
} from "@/lib/messages/voice-recorder";

type VoiceRecordingBarProps = {
  elapsedSeconds: number;
  onCancel: () => void;
  onDone: () => void;
  finishing?: boolean;
};

export function VoiceRecordingBar({
  elapsedSeconds,
  onCancel,
  onDone,
  finishing = false,
}: VoiceRecordingBarProps) {
  const atMax = elapsedSeconds >= DM_VOICE_MAX_SECONDS;

  return (
    <div className="flex items-center gap-2 rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-2 py-2">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]"
        aria-hidden
      >
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b4141e]/60 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#e87a82]" />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#e87a82]">Recording</p>
        <p className="font-mono text-lg tabular-nums text-white">
          {formatVoiceTimer(elapsedSeconds)}
          {atMax ? (
            <span className="ml-2 text-[11px] font-sans uppercase tracking-wider text-zinc-400">
              max
            </span>
          ) : null}
        </p>
      </div>

      <button
        type="button"
        onClick={onCancel}
        disabled={finishing}
        className={`${CS_BTN_SECONDARY} min-h-9 px-3`}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onDone}
        disabled={finishing}
        className={`${CS_CTA_PRIMARY_SM} min-h-9`}
        aria-label="Stop recording and preview voice message"
      >
        {finishing ? "…" : "Done"}
      </button>
    </div>
  );
}

/** Shown in toolbar slot while idle — mic affordance only. */
export function VoiceMicButton({
  active,
  disabled,
  onClick,
  title,
}: {
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-label={title || "Record voice message"}
      onClick={onClick}
      className={
        active
          ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] transition hover:bg-[#b4141e]/30"
          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent text-zinc-500 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-zinc-300 disabled:opacity-45"
      }
    >
      <IconMicrophone />
    </button>
  );
}

export function VoiceUnsupportedNotice({ onDismiss }: { onDismiss?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!onDismiss) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <p className="mb-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-[12px] leading-snug text-zinc-400">
      Voice notes are not supported on this device yet.
    </p>
  );
}
