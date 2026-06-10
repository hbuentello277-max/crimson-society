"use client";

import { DM_QUICK_REACTIONS } from "@/lib/messages/reactions";

type MessageReactionPickerProps = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export function MessageReactionPicker({ onSelect, onClose }: MessageReactionPickerProps) {
  return (
    <div
      className="absolute bottom-full left-0 z-20 mb-2 flex items-center gap-1 rounded-full border border-white/10 bg-[#141414]/95 px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md"
      role="toolbar"
      aria-label="Quick reactions"
    >
      {DM_QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-white/10 active:scale-95"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
