"use client";

import type { ReactionChip } from "@/lib/messages/reactions";

type MessageReactionChipsProps = {
  chips: ReactionChip[];
  alignEnd?: boolean;
  onToggle: (emoji: string) => void;
};

export function MessageReactionChips({ chips, alignEnd = false, onToggle }: MessageReactionChipsProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className={`mt-1 flex flex-wrap gap-1 ${alignEnd ? "justify-end" : "justify-start"}`}>
      {chips.map((chip) => (
        <button
          key={chip.emoji}
          type="button"
          onClick={() => onToggle(chip.emoji)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition active:scale-95 ${
            chip.reactedByMe
              ? "border-[#b4141e]/60 bg-[#b4141e]/20 text-[#e87a82]"
              : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/20"
          }`}
        >
          <span>{chip.emoji}</span>
          <span className="font-medium tabular-nums">{chip.count}</span>
        </button>
      ))}
    </div>
  );
}
