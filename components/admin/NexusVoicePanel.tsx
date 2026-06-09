"use client";

import type { NexusVoiceHistoryEntry } from "@/lib/admin/nexus-voice/history";
import type { NexusVoicePendingConfirmation, NexusVoiceStatus } from "@/lib/admin/nexus-voice/types";

type NexusVoicePanelProps = {
  open: boolean;
  status: NexusVoiceStatus;
  statusLabel: string | null;
  transcript: string;
  response: string;
  error: string | null;
  history: NexusVoiceHistoryEntry[];
  pendingConfirmation: NexusVoicePendingConfirmation | null;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${active ? "text-[#f1c3c7]" : "text-zinc-300"}`}
      fill="currentColor"
    >
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
    </svg>
  );
}

function kindLabel(kind: NexusVoiceHistoryEntry["kind"]) {
  switch (kind) {
    case "action":
      return "Action";
    case "operator":
      return "Operator";
    case "confirmation":
      return "Confirmed";
    default:
      return "Command";
  }
}

export function NexusVoicePanel({
  open,
  status,
  statusLabel,
  transcript,
  response,
  error,
  history,
  pendingConfirmation,
  onClose,
  onConfirm,
  onCancel,
}: NexusVoicePanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <section
        className="relative mx-auto max-w-lg overflow-hidden rounded-t-3xl border border-[#b4141e]/40 bg-gradient-to-b from-[#140608] via-black to-black shadow-[0_-12px_48px_rgba(0,0,0,0.65),0_0_32px_rgba(180,20,30,0.18)]"
        aria-label="NEXUS Voice panel"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b4141e]/80 to-transparent"
        />

        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <MicIcon active={status === "listening"} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#b4141e]">NEXUS</p>
              <h2 className="text-sm font-medium text-white">Voice Assistant</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-300 transition hover:border-white/30 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {statusLabel ? (
            <p className="text-center text-xs uppercase tracking-[0.22em] text-[#f1c3c7]">
              {statusLabel}
            </p>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          ) : null}

          {pendingConfirmation ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-amber-200/80">
                Confirmation required
              </p>
              <p className="mt-2 text-sm font-medium text-white">{pendingConfirmation.label}</p>
              <p className="mt-1 text-sm text-amber-100/90">{pendingConfirmation.summary}</p>
              <dl className="mt-3 space-y-1 text-xs text-amber-100/80">
                {Object.entries(pendingConfirmation.details).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="uppercase tracking-[0.14em] text-amber-200/70">{key}</dt>
                    <dd className="flex-1 break-words text-amber-50">
                      {typeof value === "string" ? value : JSON.stringify(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-500/30"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-zinc-200 transition hover:border-white/30"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">You said</p>
            <p className="mt-2 min-h-[2.5rem] text-sm text-zinc-200">
              {transcript || "Your transcript will appear here."}
            </p>
          </div>

          <div className="rounded-2xl border border-[#b4141e]/25 bg-[#b4141e]/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#f1c3c7]/80">NEXUS</p>
            <p className="mt-2 min-h-[2.5rem] text-sm text-white">
              {response ||
                "Ask about health, operator priorities, reports, revenue, or prepare a confirmed draft."}
            </p>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              Recent commands
            </p>
            {history.length === 0 ? (
              <p className="text-xs text-zinc-500">No voice commands yet.</p>
            ) : (
              <ul className="max-h-36 space-y-2 overflow-y-auto pr-1">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-white/5 bg-black/40 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-zinc-300">{entry.transcript}</p>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                        {kindLabel(entry.kind)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-zinc-500">{entry.response}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
