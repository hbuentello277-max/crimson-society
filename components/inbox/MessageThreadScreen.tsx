"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MessagesAvatar } from "@/components/inbox/MessagesAvatar";

export type ThreadConversation = {
  id: string;
  name: string;
  handle: string;
  profileHref?: string | null;
  photo: string | null;
  online?: boolean;
  isGroup?: boolean;
  members?: number;
};

export type ThreadMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  senderPhoto?: string | null;
  timeLabel: string;
};

type MessageThreadScreenProps = {
  open: boolean;
  conversation: ThreadConversation;
  messages: ThreadMessage[];
  draft: string;
  userId: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onBack: () => void;
  onReportMessage: (message: ThreadMessage) => void;
  focusComposer?: boolean;
};

/** BottomNav clearance + home-indicator safe area (tighter Messenger-style gap). */
const COMPOSER_BOTTOM_OFFSET = "calc(env(safe-area-inset-bottom) + 2.25rem)";

export function MessageThreadScreen({
  open,
  conversation,
  messages,
  draft,
  userId,
  onDraftChange,
  onSend,
  onBack,
  onReportMessage,
  focusComposer = false,
}: MessageThreadScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !focusComposer) return;

    const focusComposerInput = () => {
      const input = composerRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      try {
        input.setSelectionRange(input.value.length, input.value.length);
      } catch {
        // Some browsers reject selection on type=search etc.
      }
    };

    const timer = window.setTimeout(focusComposerInput, 180);
    const retry = window.setTimeout(focusComposerInput, 420);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retry);
    };
  }, [focusComposer, open, conversation.id]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, conversation.id]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%),
            radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.16), transparent 70%),
            linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 32%)
          `,
        }}
      />

      <header className="relative z-10 shrink-0 border-b border-white/10 bg-[#050505]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.65rem)]">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-lg text-white/70 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
            aria-label="Back to messages"
          >
            ‹
          </button>

          {conversation.profileHref ? (
            <Link href={conversation.profileHref} className="shrink-0">
              <MessagesAvatar
                photo={conversation.photo}
                name={conversation.name}
                online={conversation.online}
                size={40}
              />
            </Link>
          ) : (
            <MessagesAvatar
              photo={conversation.photo}
              name={conversation.name}
              online={conversation.online}
              size={40}
            />
          )}

          {conversation.profileHref ? (
            <Link href={conversation.profileHref} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{conversation.name}</p>
              <p className="truncate text-[10px] uppercase tracking-[0.22em] text-white/40">
                {conversation.handle}
              </p>
            </Link>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{conversation.name}</p>
              <p className="truncate text-[10px] uppercase tracking-[0.22em] text-white/40">
                {conversation.isGroup
                  ? `${conversation.members ?? 0} riders`
                  : conversation.handle}
              </p>
            </div>
          )}

          {conversation.profileHref ? (
            <Link
              href={conversation.profileHref}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
              aria-label="View profile"
            >
              ⋯
            </Link>
          ) : (
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70"
              aria-label="Conversation options"
            >
              ⋯
            </button>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">No messages yet</p>
          )}

          {messages.map((message, index) => {
            const isMe = message.senderId === userId;
            const prev = messages[index - 1];
            const showAvatar = !isMe && (!prev || prev.senderId !== message.senderId);

            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="h-7 w-7 flex-shrink-0">
                    {showAvatar && (
                      <MessagesAvatar
                        photo={message.senderPhoto ?? null}
                        name={message.senderName || conversation.name}
                        size={28}
                      />
                    )}
                  </div>
                )}

                <div className={`flex max-w-[78%] flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {conversation.isGroup && !isMe && showAvatar && message.senderName && (
                    <span className="mb-0.5 ml-3 text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">
                      {message.senderName}
                    </span>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isMe
                        ? "rounded-br-md bg-gradient-to-br from-[#b4141e] to-[#8a0f17] text-white shadow-[0_0_18px_rgba(180,20,30,0.25)]"
                        : "rounded-bl-md border border-white/10 bg-gradient-to-b from-[#141416] to-[#0a0a0c] text-white/90"
                    }`}
                  >
                    {message.text}
                  </div>

                  <span className="mt-1 px-1 text-[10px] uppercase tracking-[0.2em] text-white/35">
                    {message.timeLabel}
                  </span>

                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => onReportMessage(message)}
                      className="mt-1 px-1 text-[9px] uppercase tracking-[0.2em] text-zinc-500 transition hover:text-[#e87a82]"
                    >
                      Report
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="relative z-20 shrink-0 border-t border-white/10 bg-[#050505]/98 backdrop-blur-xl"
        style={{ paddingBottom: COMPOSER_BOTTOM_OFFSET }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] px-4 py-2.5">
            <input
              ref={composerRef}
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
              placeholder="Message…"
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/35"
            />
          </div>

          <button
            type="button"
            onClick={onSend}
            disabled={!draft.trim()}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
              draft.trim()
                ? "bg-[#b4141e] text-white shadow-[0_0_20px_rgba(180,20,30,0.45)] hover:bg-[#d11827]"
                : "border border-white/10 text-white/30"
            }`}
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
