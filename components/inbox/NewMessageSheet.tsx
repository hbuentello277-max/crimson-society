"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MessagesAvatar } from "@/components/inbox/MessagesAvatar";

export type NewMessageSuggestion = {
  id: string;
  name: string;
  handle: string;
  photo: string | null;
  reason: string;
};

type NewMessageSheetProps = {
  open: boolean;
  memberSearch: string;
  suggestions: NewMessageSuggestion[];
  onMemberSearchChange: (value: string) => void;
  onSelect: (peerId: string) => void;
  onClose: () => void;
};

export function NewMessageSheet({
  open,
  memberSearch,
  suggestions,
  onMemberSearchChange,
  onSelect,
  onClose,
}: NewMessageSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-message-title"
        className="flex h-[min(76dvh,660px)] w-full max-w-full flex-col rounded-t-3xl border border-white/10 bg-[#0b0b0d] shadow-[0_0_50px_rgba(180,20,30,0.18)] sm:h-auto sm:max-h-[min(88dvh,720px)] sm:max-w-md sm:rounded-3xl"
        style={{
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 justify-center pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
          <div className="min-w-0">
            <h2 id="new-message-title" className="text-lg font-semibold text-white">
              New Message
            </h2>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/35">
              Choose a rider
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 hover:border-[#b4141e]/60 hover:text-white"
            aria-label="Close new message"
          >
            ✕
          </button>
        </div>

        <div className="shrink-0 px-4 py-2.5">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <span className="text-white/40">⌕</span>
            <input
              value={memberSearch}
              onChange={(event) => onMemberSearchChange(event.target.value)}
              placeholder="Search riders..."
              className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/35"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
          <div className="space-y-2">
            {suggestions.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => onSelect(member.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-left transition hover:border-[#b4141e]/50"
              >
                <MessagesAvatar photo={member.photo} name={member.name} size={42} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{member.name}</p>
                  <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    {member.handle} · {member.reason}
                  </p>
                </div>
              </button>
            ))}

            {suggestions.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center">
                <p className="text-sm text-white/50">No riders found.</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-white/30">
                  Try another search
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
