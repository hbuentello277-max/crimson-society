"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AudioMessageBubble } from "@/components/inbox/AudioMessageBubble";
import { MessageComposer } from "@/components/inbox/MessageComposer";
import { MessageReactionChips } from "@/components/inbox/MessageReactionChips";
import { MessageReactionPicker } from "@/components/inbox/MessageReactionPicker";
import { MessagesAvatar } from "@/components/inbox/MessagesAvatar";
import { ReadReceiptIndicator } from "@/components/inbox/ReadReceiptIndicator";
import { ThreadOverflowMenu } from "@/components/inbox/ThreadOverflowMenu";
import type { DmMessageType } from "@/lib/messages/dm-message";
import type { ReactionChip } from "@/lib/messages/reactions";
import {
  latestOutgoingMessageId,
  resolveReadReceiptState,
  shouldShowReadReceipt,
} from "@/lib/messages/read-receipts";
import { CS_BUBBLE_OUTGOING } from "@/lib/crimson-accent";

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
  messageType: DmMessageType;
  text: string;
  senderId: string;
  senderName?: string;
  senderPhoto?: string | null;
  timeLabel: string;
  createdAt: string;
  deliveredAt?: string | null;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaDurationSeconds?: number | null;
};

type MessageThreadScreenProps = {
  open: boolean;
  conversation: ThreadConversation;
  messages: ThreadMessage[];
  draft: string;
  userId: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onImageSelected: (file: File) => void;
  onAudioRecorded: (file: File, durationSeconds: number) => void;
  onBack: () => void;
  onReportMessage: (message: ThreadMessage) => void;
  reactionsByMessageId?: Record<string, ReactionChip[]>;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  peerLastReadAt?: string | null;
  peerIsBlocked?: boolean;
  focusComposer?: boolean;
  sending?: boolean;
  uploadingMedia?: boolean;
  mediaUploadKind?: "image" | "audio" | null;
  uploadError?: string | null;
  readOnly?: boolean;
  readOnlyReason?: string | null;
};

const LONG_PRESS_MS = 420;

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
  onImageSelected,
  onAudioRecorded,
  onBack,
  onReportMessage,
  reactionsByMessageId = {},
  onToggleReaction,
  peerLastReadAt = null,
  peerIsBlocked = false,
  focusComposer = false,
  sending = false,
  uploadingMedia = false,
  mediaUploadKind = null,
  uploadError = null,
  readOnly = false,
  readOnlyReason = null,
}: MessageThreadScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);

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

  const latestOutgoingId = useMemo(() => {
    if (!userId) return null;

    return latestOutgoingMessageId(
      messages.map((message) => ({
        id: message.id,
        createdAt: message.createdAt,
        deliveredAt: message.deliveredAt,
        senderId: message.senderId,
      })),
      userId,
    );
  }, [messages, userId]);

  useEffect(() => {
    if (!open) {
      setActiveReactionMessageId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyWidth = body.style.width;
    const previousBodyMaxWidth = body.style.maxWidth;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyLeft = body.style.left;
    const previousBodyRight = body.style.right;
    const previousBodyBottom = body.style.bottom;
    const previousBodyHeight = body.style.height;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.width = "100%";
    body.style.maxWidth = "100%";
    body.style.position = "fixed";
    body.style.top = "0";
    body.style.left = "0";
    body.style.right = "0";
    body.style.bottom = "0";
    body.style.height = "100dvh";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.width = previousBodyWidth;
      body.style.maxWidth = previousBodyMaxWidth;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.left = previousBodyLeft;
      body.style.right = previousBodyRight;
      body.style.bottom = previousBodyBottom;
      body.style.height = previousBodyHeight;
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

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openReactionPicker = (messageId: string) => {
    if (!onToggleReaction) return;
    setActiveReactionMessageId(messageId);
  };

  const handleMessagePointerDown = (messageId: string) => {
    if (!onToggleReaction) return;

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      openReactionPicker(messageId);
    }, LONG_PRESS_MS);
  };

  const handle = conversation.handle.startsWith("@")
    ? conversation.handle
    : `@${conversation.handle.replace(/^@+/, "")}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] box-border flex w-full max-w-full flex-col overflow-x-hidden bg-black text-zinc-100">
      <header className="w-full max-w-full shrink-0 border-b border-white/10 bg-black">
        <div className="box-border flex w-full max-w-full items-center gap-2 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
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
        className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3"
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
            const reactionChips = reactionsByMessageId[message.id] ?? [];
            const showReceipt = shouldShowReadReceipt({
              messageId: message.id,
              latestOutgoingMessageId: latestOutgoingId,
              isFromCurrentUser: isMe,
              peerIsBlocked,
            });
            const receiptState = resolveReadReceiptState(
              {
                createdAt: message.createdAt,
                deliveredAt: message.deliveredAt,
              },
              peerLastReadAt,
            );

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

                <div
                  className={`group relative flex min-w-0 max-w-[min(100%,70%)] flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  {conversation.isGroup && !isMe && showAvatar && message.senderName && (
                    <span className="mb-1 ml-1 text-[11px] font-medium text-[#e87a82]">
                      {message.senderName}
                    </span>
                  )}

                  {activeReactionMessageId === message.id && onToggleReaction && (
                    <MessageReactionPicker
                      onSelect={(emoji) => onToggleReaction(message.id, emoji)}
                      onClose={() => setActiveReactionMessageId(null)}
                    />
                  )}

                  {onToggleReaction && (
                    <button
                      type="button"
                      onClick={() => openReactionPicker(message.id)}
                      className={`absolute -top-2 ${isMe ? "left-0" : "right-0"} hidden h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1a] text-sm text-zinc-300 opacity-0 transition group-hover:opacity-100 sm:flex`}
                      aria-label="Add reaction"
                    >
                      +
                    </button>
                  )}

                  {message.messageType === "image" && message.mediaUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(message.mediaUrl ?? null)}
                      onTouchStart={() => handleMessagePointerDown(message.id)}
                      onTouchEnd={clearLongPressTimer}
                      onTouchCancel={clearLongPressTimer}
                      onMouseDown={() => handleMessagePointerDown(message.id)}
                      onMouseUp={clearLongPressTimer}
                      onMouseLeave={clearLongPressTimer}
                      onContextMenu={(event) => {
                        if (!onToggleReaction) return;
                        event.preventDefault();
                        openReactionPicker(message.id);
                      }}
                      className="block overflow-hidden rounded-[22px] border border-white/10"
                    >
                      <Image
                        src={message.mediaUrl}
                        alt="Shared photo"
                        width={280}
                        height={280}
                        className="max-h-72 max-w-full w-auto object-cover"
                        unoptimized
                      />
                    </button>
                  ) : message.messageType === "audio" && message.mediaUrl ? (
                    <div
                      onTouchStart={() => handleMessagePointerDown(message.id)}
                      onTouchEnd={clearLongPressTimer}
                      onTouchCancel={clearLongPressTimer}
                      onMouseDown={() => handleMessagePointerDown(message.id)}
                      onMouseUp={clearLongPressTimer}
                      onMouseLeave={clearLongPressTimer}
                      onContextMenu={(event) => {
                        if (!onToggleReaction) return;
                        event.preventDefault();
                        openReactionPicker(message.id);
                      }}
                    >
                      <AudioMessageBubble
                        mediaUrl={message.mediaUrl}
                        durationSeconds={message.mediaDurationSeconds}
                        isMe={isMe}
                      />
                    </div>
                  ) : (
                    <div
                      onTouchStart={() => handleMessagePointerDown(message.id)}
                      onTouchEnd={clearLongPressTimer}
                      onTouchCancel={clearLongPressTimer}
                      onMouseDown={() => handleMessagePointerDown(message.id)}
                      onMouseUp={clearLongPressTimer}
                      onMouseLeave={clearLongPressTimer}
                      onContextMenu={(event) => {
                        if (!onToggleReaction) return;
                        event.preventDefault();
                        openReactionPicker(message.id);
                      }}
                      className={`px-4 py-3 text-[15px] leading-relaxed ${
                        isMe
                          ? CS_BUBBLE_OUTGOING
                          : "rounded-[22px] rounded-bl-md bg-[#262626] text-white/95"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  {onToggleReaction && (
                    <MessageReactionChips
                      chips={reactionChips}
                      alignEnd={isMe}
                      onToggle={(emoji) => onToggleReaction(message.id, emoji)}
                    />
                  )}

                  <div
                    className={`mt-1 flex items-center gap-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    <span className="text-[11px] text-zinc-500">{message.timeLabel}</span>
                    {showReceipt && <ReadReceiptIndicator state={receiptState} />}
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

      {readOnly ? (
        <div className="border-t border-white/10 bg-[#070707] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            {readOnlyReason || "This conversation is read-only."}
          </p>
        </div>
      ) : (
        <MessageComposer
          draft={draft}
          inputRef={composerRef}
          onDraftChange={onDraftChange}
          onSend={onSend}
          onImageSelected={onImageSelected}
          onAudioRecorded={onAudioRecorded}
          sending={sending}
          uploadingMedia={uploadingMedia}
          mediaUploadKind={mediaUploadKind}
          uploadError={uploadError}
        />
      )}

      {previewImageUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setPreviewImageUrl(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] text-2xl text-white/80"
              onClick={() => setPreviewImageUrl(null)}
              aria-label="Close preview"
            >
              ✕
            </button>
            <Image
              src={previewImageUrl}
              alt="Full size photo"
              width={1200}
              height={1200}
              className="max-h-[85vh] max-w-full object-contain"
              unoptimized
              onClick={(event) => event.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </div>,
    document.body,
  );
}
