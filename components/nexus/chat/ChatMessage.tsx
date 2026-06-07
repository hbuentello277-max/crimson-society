"use client";

import { ChatSources } from "@/components/nexus/chat/ChatSources";
import type { ChatSource } from "@/lib/chat/types";

type ChatTurn = {
  role: "user" | "nexus";
  message: string;
  sources?: ChatSource[];
  related_routes?: string[];
  confidence?: number;
};

export function ChatMessage({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === "user";

  return (
    <div className={`flex min-w-0 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`min-w-0 max-w-[95%] rounded-2xl border px-3 py-3 sm:max-w-[85%] sm:px-4 ${
          isUser
            ? "border-[#b4141e]/40 bg-[#b4141e]/15 text-white"
            : "border-[#b4141e]/20 bg-[#060405]/95 text-zinc-200"
        }`}
      >
        <p className="text-[9px] uppercase tracking-[0.22em] text-[#e87a82]">
          {isUser ? "You" : "Nexus"}
        </p>
        <p className="mt-2 break-words text-sm leading-6">{turn.message}</p>

        {!isUser && (turn.sources?.length || turn.related_routes?.length || turn.confidence != null) ? (
          <div className="mt-3 border-t border-[#b4141e]/15 pt-3">
            <ChatSources
              sources={turn.sources ?? []}
              relatedRoutes={turn.related_routes ?? []}
              confidence={turn.confidence}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
