"use client";

import { SUGGESTED_ANALYSIS_PROMPTS } from "@/lib/ai-analysis/prompts";

type SuggestedPromptsProps = {
  disabled?: boolean;
  onSelect: (prompt: string) => void;
};

export function SuggestedPrompts({ disabled, onSelect }: SuggestedPromptsProps) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">Suggested questions</p>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SUGGESTED_ANALYSIS_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="shrink-0 rounded-full border border-[#b4141e]/25 bg-[#0a0608]/90 px-3 py-2 text-left text-[11px] leading-snug text-zinc-300 transition hover:border-[#b4141e]/45 hover:bg-[#b4141e]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
