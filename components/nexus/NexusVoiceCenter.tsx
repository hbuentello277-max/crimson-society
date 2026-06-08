"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NexusCommandFrame, NexusSectionFrame } from "@/components/nexus/NexusShared";
import { useSpeechRecognition } from "@/hooks/nexus/useSpeechRecognition";
import {
  appendVoiceCommandHistory,
  clearVoiceCommandHistory,
  readVoiceCommandHistory,
  type VoiceCommandHistoryEntry,
} from "@/lib/nexus/voice-history";
import {
  listVoiceCommandExamples,
  resolveVoiceCommand,
  type VoiceCommandMatch,
} from "@/lib/nexus/voice-commands";

export function NexusVoiceCenter() {
  const router = useRouter();
  const {
    supported,
    listening,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    cancelListening,
    clearInterimTranscript,
  } = useSpeechRecognition();

  const [transcript, setTranscript] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastMatch, setLastMatch] = useState<VoiceCommandMatch | null>(null);
  const [history, setHistory] = useState<VoiceCommandHistoryEntry[]>([]);

  const commandExamples = listVoiceCommandExamples();

  useEffect(() => {
    setHistory(readVoiceCommandHistory());
  }, []);

  useEffect(() => {
    if (interimTranscript) {
      setTranscript(interimTranscript);
    }
  }, [interimTranscript]);

  const handleClear = useCallback(() => {
    cancelListening();
    setTranscript("");
    setSubmitError(null);
    setLastMatch(null);
    clearInterimTranscript();
  }, [cancelListening, clearInterimTranscript]);

  const handleSubmit = useCallback(() => {
    const trimmed = transcript.trim();
    if (!trimmed) {
      setSubmitError("Enter or speak a navigation command first.");
      return;
    }

    const match = resolveVoiceCommand(trimmed);
    if (!match) {
      setSubmitError(`No navigation match for "${trimmed}". Try "open overview" or "open alerts".`);
      setLastMatch(null);
      setHistory(
        appendVoiceCommandHistory({
          transcript: trimmed,
          route: null,
          label: null,
        }),
      );
      return;
    }

    setSubmitError(null);
    setLastMatch(match);
    setHistory(
      appendVoiceCommandHistory({
        transcript: trimmed,
        route: match.href,
        label: match.label,
      }),
    );
    router.push(match.href);
  }, [router, transcript]);

  const handleMicPressStart = useCallback(() => {
    if (!supported) {
      return;
    }

    setSubmitError(null);
    startListening();
  }, [startListening, supported]);

  const handleMicPressEnd = useCallback(() => {
    if (!listening) {
      return;
    }

    stopListening();
  }, [listening, stopListening]);

  return (
    <NexusSectionFrame
      title="Voice Command"
      description="Navigation-only voice shell. No approvals, execution, sync, or operator actions."
      loading={false}
      error={null}
      onRefresh={async () => {
        handleClear();
        setHistory(readVoiceCommandHistory());
      }}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-[#b4141e]/35 bg-[#0a0608]/90 px-4 py-3 text-sm text-[#f1c3c7]">
          <p className="font-medium">Voice is navigation-only</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Commands open existing Nexus routes only. No OpenAI billing, no automation, no data
            changes, and no audio is stored.
          </p>
        </div>

        <NexusCommandFrame className="p-4 sm:p-6">
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Push to talk"}
              disabled={!supported}
              onMouseDown={handleMicPressStart}
              onMouseUp={handleMicPressEnd}
              onMouseLeave={listening ? handleMicPressEnd : undefined}
              onTouchStart={(event) => {
                event.preventDefault();
                handleMicPressStart();
              }}
              onTouchEnd={(event) => {
                event.preventDefault();
                handleMicPressEnd();
              }}
              className={`flex h-28 w-28 items-center justify-center rounded-full border-2 transition sm:h-32 sm:w-32 ${
                listening
                  ? "border-[#b4141e] bg-[#b4141e]/30 shadow-[0_0_32px_rgba(180,20,30,0.45)]"
                  : "border-[#b4141e]/50 bg-[#12080a] hover:border-[#b4141e] hover:bg-[#b4141e]/15"
              } ${!supported ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span className="text-center">
                <span className="block text-3xl" aria-hidden>
                  {listening ? "◉" : "🎙"}
                </span>
                <span className="mt-2 block text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">
                  {listening ? "Listening" : "Hold to talk"}
                </span>
              </span>
            </button>

            {!supported ? (
              <p className="text-center text-xs text-zinc-400">
                Web Speech API is unavailable here. Use the text field below.
              </p>
            ) : (
              <p className="text-center text-xs text-zinc-500">
                Press and hold the mic, then release to finish capture.
              </p>
            )}

            {speechError ? (
              <p className="text-center text-xs text-amber-300">{speechError}</p>
            ) : null}
          </div>

          <div className="mt-6 space-y-3">
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">
              Transcript
            </label>
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              rows={3}
              placeholder='Try "open overview" or "open alerts"'
              className="w-full rounded-lg border border-[#b4141e]/25 bg-[#050304] px-3 py-3 text-sm text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-[#b4141e]/60"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                className="min-h-11 rounded-lg border border-[#b4141e]/60 bg-[#b4141e]/20 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/30"
              >
                Submit transcript
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="min-h-11 rounded-lg border border-[#b4141e]/25 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-zinc-400 transition hover:border-[#b4141e]/40 hover:text-zinc-200"
              >
                Clear
              </button>
              {listening ? (
                <button
                  type="button"
                  onClick={cancelListening}
                  className="min-h-11 rounded-lg border border-amber-500/40 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-amber-200 transition hover:bg-amber-500/10"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            {submitError ? <p className="text-xs text-amber-300">{submitError}</p> : null}

            {lastMatch ? (
              <p className="text-xs text-emerald-300">
                Navigating to {lastMatch.label} ({lastMatch.href})
              </p>
            ) : null}
          </div>
        </NexusCommandFrame>

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

        <NexusCommandFrame className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">
              Local command history
            </h3>
            {history.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clearVoiceCommandHistory();
                  setHistory([]);
                }}
                className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:text-zinc-300"
              >
                Clear history
              </button>
            ) : null}
          </div>
          {history.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">No local voice history yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-md border border-[#b4141e]/15 bg-[#080506]/80 px-3 py-2 text-xs"
                >
                  <p className="text-zinc-200">&ldquo;{entry.transcript}&rdquo;</p>
                  <p className="mt-1 text-zinc-500">
                    {entry.route ? (
                      <Link href={entry.route} className="text-[#e87a82] hover:text-[#f1c3c7]">
                        {entry.label} → {entry.route}
                      </Link>
                    ) : (
                      "No route matched"
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </NexusCommandFrame>
      </div>
    </NexusSectionFrame>
  );
}
