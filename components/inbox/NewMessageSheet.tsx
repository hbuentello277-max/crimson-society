"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessagesAvatar } from "@/components/inbox/MessagesAvatar";
import { BOTTOM_NAV_CLEARANCE_VALUE } from "@/lib/crimson-accent";

export type NewMessageSuggestion = {
  id: string;
  name: string;
  handle: string;
  photo: string | null;
  reason: string;
};

type NewMessageSheetProps = {
  open: boolean;
  headerOffsetPx?: number;
  memberSearch: string;
  suggestions: NewMessageSuggestion[];
  onMemberSearchChange: (value: string) => void;
  onSelect: (peerId: string) => void;
  onClose: () => void;
};

const DISMISS_DRAG_THRESHOLD_PX = 72;

export function NewMessageSheet({
  open,
  headerOffsetPx = 0,
  memberSearch,
  suggestions,
  onMemberSearchChange,
  onSelect,
  onClose,
}: NewMessageSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const resetDrag = useCallback(() => {
    dragOffsetRef.current = 0;
    setDragY(0);
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetDrag();
      return;
    }

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
  }, [open, onClose, resetDrag]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    dragStartYRef.current = event.clientY;
    dragOffsetRef.current = dragY;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const delta = event.clientY - dragStartYRef.current;
    const nextOffset = Math.max(0, dragOffsetRef.current + delta);
    setDragY(nextOffset);
  };

  const finishDrag = () => {
    if (!isDragging) return;

    setIsDragging(false);

    if (dragY >= DISMISS_DRAG_THRESHOLD_PX) {
      onClose();
      resetDrag();
      return;
    }

    resetDrag();
  };

  if (!open || typeof document === "undefined") return null;

  const sheetTop = Math.max(headerOffsetPx, 0);

  return createPortal(
    <div
      className="fixed inset-x-0 z-[300] flex justify-center"
      style={{
        top: sheetTop,
        bottom: BOTTOM_NAV_CLEARANCE_VALUE,
      }}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-message-title"
        className="relative z-[1] flex h-full w-full max-w-full flex-col rounded-b-3xl border border-t-0 border-white/10 bg-[#0b0b0d] shadow-[0_16px_50px_rgba(180,20,30,0.18)] sm:max-w-md sm:rounded-3xl sm:border"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? "none" : "transform 0.24s ease-out",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex shrink-0 touch-none flex-col items-center border-b border-white/10 px-4 pb-2 pt-2"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <button
            type="button"
            className="flex h-8 w-full items-center justify-center"
            aria-label="Drag down to close"
            onClick={(event) => event.preventDefault()}
          >
            <span className="h-1.5 w-12 rounded-full bg-white/30" aria-hidden />
          </button>

          <div className="flex w-full items-center justify-between gap-3 pt-1">
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
                    {member.reason}
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
