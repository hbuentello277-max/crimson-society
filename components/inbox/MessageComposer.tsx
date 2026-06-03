"use client";

import type { ChangeEvent, RefObject } from "react";
import { useRef, useState } from "react";
import { EmojiTray } from "@/components/inbox/EmojiTray";
import { IconCamera, IconGallery, IconMicrophone, IconSend } from "@/components/inbox/inbox-icons";
import {
  CS_SEND_BTN,
  CS_SEND_BTN_DISABLED,
  CS_TOOLBAR_BTN_ACTIVE,
  CS_TOOLBAR_BTN_DISABLED,
  CS_TOOLBAR_BTN_INACTIVE,
} from "@/lib/crimson-accent";

/** Minimal gap above BottomNav + home indicator (Messaging V3 mockup). */
export const MESSAGE_COMPOSER_BOTTOM_OFFSET = "calc(env(safe-area-inset-bottom) + 0.75rem)";

type MessageComposerProps = {
  draft: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onImageSelected: (file: File) => void;
  sending?: boolean;
  uploadingMedia?: boolean;
};

export function MessageComposer({
  draft,
  inputRef,
  onDraftChange,
  onSend,
  onImageSelected,
  sending = false,
  uploadingMedia = false,
}: MessageComposerProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const busy = sending || uploadingMedia;
  const canSend = Boolean(draft.trim()) && !busy;

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onImageSelected(file);
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef?.current;
    if (!input) {
      onDraftChange(draft + emoji);
      return;
    }

    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    onDraftChange(next);

    requestAnimationFrame(() => {
      const caret = start + emoji.length;
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  };

  return (
    <div
      className="shrink-0 border-t border-[#b4141e]/25 bg-[#050505]"
      style={{ paddingBottom: MESSAGE_COMPOSER_BOTTOM_OFFSET }}
    >
      <EmojiTray open={emojiOpen} onPick={insertEmoji} />

      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        className="hidden"
        onChange={handleImageChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageChange}
      />

      <div className="px-3 pb-2 pt-2">
        <div className="mb-2 flex items-center justify-between gap-1 rounded-full border border-white/10 bg-[#0c0c0c]/90 px-1 py-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className={uploadingMedia ? CS_TOOLBAR_BTN_ACTIVE : CS_TOOLBAR_BTN_INACTIVE}
            aria-label="Take photo"
          >
            <IconCamera />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => galleryRef.current?.click()}
            className={uploadingMedia ? CS_TOOLBAR_BTN_ACTIVE : CS_TOOLBAR_BTN_INACTIVE}
            aria-label="Choose from gallery"
          >
            <IconGallery />
          </button>
          <button
            type="button"
            disabled
            title="Voice notes coming soon"
            aria-label="Voice notes coming soon"
            className={CS_TOOLBAR_BTN_DISABLED}
          >
            <IconMicrophone />
          </button>
          <button
            type="button"
            onClick={() => setEmojiOpen((open) => !open)}
            className={emojiOpen ? CS_TOOLBAR_BTN_ACTIVE : CS_TOOLBAR_BTN_INACTIVE}
            aria-label="Insert emoji"
            aria-expanded={emojiOpen}
          >
            <span className="text-lg leading-none">☺</span>
          </button>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-full border border-white/10 bg-[#1a1a1a] px-4 py-2.5 focus-within:border-[#b4141e]/50 focus-within:ring-1 focus-within:ring-[#b4141e]/15">
            <input
              ref={inputRef}
              type="text"
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="on"
              value={draft}
              disabled={busy}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              placeholder={uploadingMedia ? "Uploading photo…" : "Message..."}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40 disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className={canSend ? CS_SEND_BTN : CS_SEND_BTN_DISABLED}
            aria-label="Send message"
          >
            <IconSend />
          </button>
        </div>
      </div>
    </div>
  );
}
