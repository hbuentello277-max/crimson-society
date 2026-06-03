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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setPlaying(false);
    setProgress(0);
    setDuration(durationSeconds ?? 0);
  }, [mediaUrl, durationSeconds]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!audio.duration) return;
      setProgress(audio.currentTime / audio.duration);
    };
    const onLoadedMetadata = () => {
      setLoading(false);
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onCanPlay = () => setLoading(false);
    const onWaiting = () => setLoading(true);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onError = () => {
      setLoading(false);
      setError(true);
      setPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [mediaUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      await audio.play();
      setPlaying(true);
      setError(false);
    } catch {
      setPlaying(false);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const durationLabel =
    error
      ? "Unavailable"
      : duration > 0
        ? formatDuration(duration)
        : loading
          ? "Loading…"
          : "Voice message";

  return (
    <div
      className={`flex w-full min-w-0 max-w-[min(100%,240px)] items-center gap-3 rounded-[22px] px-4 py-3 ${
        isMe
          ? "rounded-br-md border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]"
          : "rounded-bl-md bg-[#262626] text-white/95"
      }`}
    >
      <button
        type="button"
        onClick={() => void togglePlay()}
        disabled={error}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isMe ? "bg-white/20" : "bg-white/10"
        } disabled:opacity-40`}
        aria-label={
          error
            ? "Voice message unavailable"
            : playing
              ? "Pause voice message"
              : "Play voice message"
        }
      >
        {loading && !error ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : playing ? (
          "❚❚"
        ) : error ? (
          "!"
        ) : (
          "▶"
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className={`h-1.5 overflow-hidden rounded-full ${isMe ? "bg-white/25" : "bg-white/10"}`}>
          <div
            className={`h-full rounded-full transition-all ${isMe ? "bg-white" : "bg-[#b4141e]"}`}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] opacity-80">{durationLabel}</p>
      </div>

      <audio ref={audioRef} src={mediaUrl} preload="metadata" className="hidden" />
    </div>
  );
}
