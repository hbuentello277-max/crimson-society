"use client";

import { useEffect, useRef, useState } from "react";

type AudioMessageBubbleProps = {
  mediaUrl: string;
  durationSeconds?: number | null;
  isMe: boolean;
};

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioMessageBubble({ mediaUrl, durationSeconds, isMe }: AudioMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!audio.duration) return;
      setProgress(audio.currentTime / audio.duration);
    };
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [mediaUrl]);

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
    <div
      className={`flex min-w-[200px] max-w-full items-center gap-3 rounded-[22px] px-4 py-3 ${
        isMe ? "rounded-br-md bg-[#b4141e] text-white" : "rounded-bl-md bg-[#262626] text-white/95"
      }`}
    >
      <button
        type="button"
        onClick={() => void togglePlay()}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isMe ? "bg-white/20" : "bg-white/10"
        }`}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? "❚❚" : "▶"}
      </button>

      <div className="min-w-0 flex-1">
        <div className={`h-1.5 overflow-hidden rounded-full ${isMe ? "bg-white/25" : "bg-white/10"}`}>
          <div
            className={`h-full rounded-full transition-all ${isMe ? "bg-white" : "bg-[#b4141e]"}`}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] opacity-80">
          {duration > 0 ? formatDuration(duration) : "Voice message"}
        </p>
      </div>

      <audio ref={audioRef} src={mediaUrl} preload="metadata" className="hidden" />
    </div>
  );
}
