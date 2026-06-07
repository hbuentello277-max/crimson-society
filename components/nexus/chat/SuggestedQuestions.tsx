"use client";

import { STARTER_QUESTIONS } from "@/lib/chat/prompts";

type SuggestedQuestionsProps = {
  disabled?: boolean;
  onSelect: (question: string) => void;
};

export function SuggestedQuestions({ disabled, onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">Starter questions</p>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STARTER_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className="shrink-0 rounded-full border border-[#b4141e]/25 bg-[#0a0608]/90 px-3 py-2 text-left text-[11px] leading-snug text-zinc-300 transition hover:border-[#b4141e]/45 hover:bg-[#b4141e]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
