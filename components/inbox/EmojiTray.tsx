"use client";

const QUICK_EMOJIS = ["🔥", "❤️", "😂", "👀", "🏍️", "💨", "🙌", "😮‍💨"] as const;

type EmojiTrayProps = {
  open: boolean;
  onPick: (emoji: string) => void;
};

export function EmojiTray({ open, onPick }: EmojiTrayProps) {
  if (!open) return null;

  return (
    <div className="flex flex-wrap gap-1 border-t border-white/10 bg-[#0a0a0a] px-3 py-2">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:bg-white/10"
          aria-label={`Insert ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
