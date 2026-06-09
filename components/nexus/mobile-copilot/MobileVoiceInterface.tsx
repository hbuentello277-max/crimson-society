"use client";

import type { CopilotVoiceDisplayStatus } from "@/lib/mobile-copilot/types";

export function MobileVoiceInterface({
  status,
  statusLabel,
  disabled,
  isListening,
  conversationPaused,
  onListen,
  onStop,
  onPause,
  onResume,
  typedInput,
  onTypedInputChange,
  onSubmitTyped,
}: {
  status: CopilotVoiceDisplayStatus;
  statusLabel: string;
  disabled?: boolean;
  isListening: boolean;
  conversationPaused: boolean;
  onListen: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  typedInput: string;
  onTypedInputChange: (value: string) => void;
  onSubmitTyped: () => void;
}) {
  const active = status === "listening" || status === "speaking" || status === "thinking";

  return (
    <section className="sticky bottom-0 z-20 -mx-3 border-t border-[#b4141e]/25 bg-[#010101]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:-mx-4 sm:px-4">
      <div className="mx-auto max-w-lg space-y-3">
        <div className="flex items-center justify-center">
          <span
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
              active
                ? "border-[#b4141e]/50 bg-[#b4141e]/15 text-[#f1c3c7]"
                : conversationPaused
                  ? "border-zinc-600/50 bg-zinc-800/40 text-zinc-300"
                  : "border-white/10 bg-black/40 text-zinc-400"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={disabled || conversationPaused}
            onClick={onListen}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full border-4 transition disabled:opacity-50 ${
              isListening
                ? "border-[#f1c3c7] bg-[#b4141e] shadow-[0_0_40px_rgba(180,20,30,0.45)]"
                : "border-[#b4141e]/60 bg-[#b4141e]/20 shadow-[0_0_28px_rgba(180,20,30,0.2)]"
            }`}
          >
            {isListening ? (
              <span className="absolute inset-0 animate-ping rounded-full border border-[#b4141e]/40" />
            ) : null}
            <svg aria-hidden viewBox="0 0 24 24" className="relative h-9 w-9 text-white" fill="currentColor">
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onStop}
            className="min-h-11 rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-300"
          >
            Stop
          </button>
          <button
            type="button"
            disabled={disabled || conversationPaused}
            onClick={onPause}
            className="min-h-11 rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-300"
          >
            Pause
          </button>
          <button
            type="button"
            disabled={disabled || !conversationPaused}
            onClick={onResume}
            className="min-h-11 rounded-xl border border-[#b4141e]/35 bg-[#b4141e]/10 px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-[#f1c3c7]"
          >
            Resume
          </button>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitTyped();
          }}
        >
          <input
            value={typedInput}
            onChange={(event) => onTypedInputChange(event.target.value)}
            placeholder="Type a founder question…"
            disabled={disabled || conversationPaused}
            className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={disabled || conversationPaused || !typedInput.trim()}
            className="min-h-11 shrink-0 rounded-xl border border-[#b4141e]/45 bg-[#b4141e]/15 px-4 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
