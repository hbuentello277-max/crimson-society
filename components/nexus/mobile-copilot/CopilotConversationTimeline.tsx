"use client";

import { useEffect, useRef } from "react";
import type { CopilotConversationEntry } from "@/lib/mobile-copilot/types";

export function CopilotConversationTimeline({
  entries,
}: {
  entries: CopilotConversationEntry[];
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const ordered = [...entries].reverse();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  return (
    <section className="flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#b4141e]/20 bg-[#060405]/90">
      <div className="border-b border-[#b4141e]/15 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">Conversation</p>
        <p className="mt-1 text-xs text-zinc-500">Session history only · cleared when the tab closes</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {ordered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">
            Ask NEXUS what matters now, tap a quick action, or use the mic below.
          </p>
        ) : (
          ordered.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.role === "founder" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  entry.role === "founder"
                    ? "rounded-br-md border border-[#b4141e]/35 bg-[#b4141e]/15 text-[#f8e8ea]"
                    : "rounded-bl-md border border-white/10 bg-black/40 text-zinc-200"
                }`}
              >
                <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">
                  {entry.role === "founder" ? "You" : "NEXUS"}
                  {entry.source === "quick_action" ? " · Quick action" : null}
                  {entry.source === "typed" ? " · Typed" : null}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{entry.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
