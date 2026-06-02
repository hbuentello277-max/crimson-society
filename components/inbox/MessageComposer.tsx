"use client";

import type { RefObject } from "react";
import { IconCamera, IconGallery, IconMicrophone, IconSend } from "@/components/inbox/inbox-icons";

/** Minimal gap above BottomNav + home indicator (Messaging V3 mockup). */
export const MESSAGE_COMPOSER_BOTTOM_OFFSET = "calc(env(safe-area-inset-bottom) + 0.75rem)";

type MessageComposerProps = {
  draft: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  onDraftChange: (value: string) => void;
  onSend: () => void;
};

function MediaButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled
      title={`${label} — coming soon`}
      aria-label={`${label} (coming soon)`}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/55 transition hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
    </button>
  );
}

export function MessageComposer({ draft, inputRef, onDraftChange, onSend }: MessageComposerProps) {
  return (
    <div
      className="shrink-0 border-t border-white/10 bg-black"
      style={{ paddingBottom: MESSAGE_COMPOSER_BOTTOM_OFFSET }}
    >
      <div className="flex items-end gap-1.5 px-3 pb-2 pt-2">
        <MediaButton label="Camera">
          <IconCamera />
        </MediaButton>
        <MediaButton label="Gallery">
          <IconGallery />
        </MediaButton>
        <MediaButton label="Voice memo">
          <IconMicrophone />
        </MediaButton>

        <div className="flex min-w-0 flex-1 items-center rounded-full border border-white/10 bg-[#1a1a1a] px-4 py-2.5">
          <input
            ref={inputRef}
            type="text"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Message..."
            className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40"
          />
        </div>

        <button
          type="button"
          onClick={onSend}
          disabled={!draft.trim()}
          className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
            draft.trim()
              ? "bg-[#b4141e] text-white shadow-[0_0_16px_rgba(180,20,30,0.4)]"
              : "bg-[#3a3a3a] text-white/35"
          }`}
          aria-label="Send message"
        >
          <IconSend />
        </button>
      </div>
    </div>
  );
}
