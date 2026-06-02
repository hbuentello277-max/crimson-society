"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { IconCheck } from "@/components/inbox/inbox-icons";
import { MessageComposer } from "@/components/inbox/MessageComposer";
import { MessagesAvatar } from "@/components/inbox/MessagesAvatar";
import { ThreadOverflowMenu } from "@/components/inbox/ThreadOverflowMenu";

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
  createdAt: string;
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

function daySeparatorLabel(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";

  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

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

  const messagesWithSeparators = useMemo(() => {
    const items: Array<{ type: "separator"; label: string } | { type: "message"; message: ThreadMessage }> =
      [];
    let lastDay: string | null = null;

    for (const message of messages) {
      const label = daySeparatorLabel(message.createdAt);
      if (label && label !== lastDay) {
        items.push({ type: "separator", label });
        lastDay = label;
      }
      items.push({ type: "message", message });
    }

    return items;
  }, [messages]);

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
        // ignore
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

  const handle = conversation.handle.startsWith("@")
    ? conversation.handle
    : `@${conversation.handle.replace(/^@+/, "")}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-zinc-100">
      <header className="shrink-0 border-b border-white/10 bg-black">
        <div className="flex items-center gap-2 px-3 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl text-white/80 hover:text-white"
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

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-white">
              {conversation.name}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {conversation.isGroup
                ? `${conversation.members ?? 0} riders`
                : handle}
            </p>
          </div>

          <ThreadOverflowMenu
            profileHref={conversation.profileHref}
            onReportConversation={
              messages.find((m) => m.senderId !== userId)
                ? () => {
                    const firstOther = messages.find((m) => m.senderId !== userId);
                    if (firstOther) onReportMessage(firstOther);
                  }
                : undefined
            }
          />
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
      >
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-500">No messages yet</p>
        )}

        <div className="flex flex-col gap-2">
          {messagesWithSeparators.map((item, index) => {
            if (item.type === "separator") {
              return (
                <p
                  key={`sep-${item.label}-${index}`}
                  className="py-2 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500"
                >
                  {item.label}
                </p>
              );
            }

            const message = item.message;
            const isMe = message.senderId === userId;
            const prev = messages[messages.indexOf(message) - 1];
            const showAvatar = !isMe && (!prev || prev.senderId !== message.senderId);

            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="h-7 w-7 shrink-0">
                    {showAvatar && (
                      <MessagesAvatar
                        photo={message.senderPhoto ?? null}
                        name={message.senderName || conversation.name}
                        size={28}
                      />
                    )}
                  </div>
                )}

                <div className={`flex max-w-[70%] flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {conversation.isGroup && !isMe && showAvatar && message.senderName && (
                    <span className="mb-1 ml-1 text-[11px] font-medium text-[#e87a82]">
                      {message.senderName}
                    </span>
                  )}

                  <div
                    className={`px-4 py-3 text-[15px] leading-relaxed ${
                      isMe
                        ? "rounded-[22px] rounded-br-md bg-[#b4141e] text-white"
                        : "rounded-[22px] rounded-bl-md bg-[#262626] text-white/95"
                    }`}
                  >
                    {message.text}
                  </div>

                  <div
                    className={`mt-1 flex items-center gap-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    <span className="text-[11px] text-zinc-500">{message.timeLabel}</span>
                    {isMe && <IconCheck className="text-zinc-500" />}
                  </div>

                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => onReportMessage(message)}
                      className="mt-0.5 px-1 text-[10px] text-zinc-600 hover:text-[#e87a82]"
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

      <MessageComposer
        draft={draft}
        inputRef={composerRef}
        onDraftChange={onDraftChange}
        onSend={onSend}
      />
    </div>,
    document.body,
  );
}
