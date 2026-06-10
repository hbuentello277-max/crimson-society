"use client";

import { useEffect, useRef, useState } from "react";
import { CS_CTA_PRIMARY_SM, CS_BTN_SECONDARY } from "@/lib/crimson-accent";
import { formatVoiceTimer } from "@/lib/messages/voice-recorder";

type VoicePreviewBarProps = {
  objectUrl: string;
  durationSeconds: number;
  onCancel: () => void;
  onSend: () => void;
  sending?: boolean;
};

export function VoicePreviewBar({
  objectUrl,
  durationSeconds,
  onCancel,
  onSend,
  sending = false,
}: VoicePreviewBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!audio.duration) return;
      setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [objectUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#141414] px-2 py-2">
      <button
        type="button"
        onClick={() => void togglePlay()}
        disabled={sending}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 text-[#e87a82] disabled:opacity-50"
        aria-label={playing ? "Pause preview" : "Play preview"}
      >
        {playing ? "❚❚" : "▶"}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Preview</p>
        <div className="mt-0.5 flex items-center gap-2">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#b4141e] transition-all"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-sm tabular-nums text-white">
            {formatVoiceTimer(durationSeconds)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onCancel}
        disabled={sending}
        className={`${CS_BTN_SECONDARY} min-h-9 px-3`}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSend}
        disabled={sending}
        className={`${CS_CTA_PRIMARY_SM} min-h-9`}
        aria-label="Send voice message"
      >
        {sending ? "Sending…" : "Send"}
      </button>

      <audio ref={audioRef} src={objectUrl} preload="metadata" className="hidden" />
    </div>
  );
}
