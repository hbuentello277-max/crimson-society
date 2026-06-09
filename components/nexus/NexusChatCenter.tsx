"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ChatInput } from "@/components/nexus/chat/ChatInput";
import { ChatMessage } from "@/components/nexus/chat/ChatMessage";
import { SuggestedQuestions } from "@/components/nexus/chat/SuggestedQuestions";
import { NexusSectionFrame } from "@/components/nexus/NexusShared";
import type { ChatSource } from "@/lib/chat/types";

type ChatTurn = {
  id: string;
  role: "user" | "nexus";
  message: string;
  sources?: ChatSource[];
  related_routes?: string[];
  confidence?: number;
};

type ChatApiResponse = {
  ok?: boolean;
  answer?: string;
  sources?: ChatSource[];
  related_routes?: string[];
  confidence?: number;
  error?: string;
};

export function NexusChatCenter() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || loading) {
      return;
    }

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: "user",
      message: trimmed,
    };

    setTurns((current) => [...current, userTurn]);
    setDraft("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/nexus/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const payload = (await response.json().catch(() => null)) as ChatApiResponse | null;

      if (!response.ok) {
        throw new Error(payload?.error || `Request failed (${response.status})`);
      }

      const nexusTurn: ChatTurn = {
        id: `nexus-${Date.now()}`,
        role: "nexus",
        message: payload?.answer || "Data unavailable.",
        sources: payload?.sources,
        related_routes: payload?.related_routes,
        confidence: payload?.confidence,
      };

      setTurns((current) => [...current, nexusTurn]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }, [loading]);

  return (
    <NexusSectionFrame
      title="Chat"
      description="Talk directly to Nexus. Answers are grounded in live operational data — read-only, no execution, no automation."
      loading={false}
      error={error}
      onRefresh={async () => {
        setTurns([]);
        setError(null);
      }}
    >
      <div className="min-w-0 space-y-4 overflow-x-hidden">
        <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm leading-6 text-zinc-300">
          Ask about status, risks, growth, strategy, or history. Nexus pulls from Platform Status,
          Copilot, Forecasting, and the rest of the command stack — never inventing facts.
        </div>

        <SuggestedQuestions
          disabled={loading}
          onSelect={(question) => {
            setDraft(question);
            void sendMessage(question);
          }}
        />

        <div
          ref={scrollRef}
          className="max-h-[min(52vh,28rem)] min-h-[12rem] space-y-3 overflow-y-auto overflow-x-hidden rounded-2xl border border-[#b4141e]/20 bg-[#080506]/80 p-3 sm:p-4"
        >
          {turns.length === 0 ? (
            <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="font-serif text-lg text-white">Nexus is listening.</p>
              <p className="max-w-md text-sm leading-6 text-zinc-500">
                Pick a starter question or type your own. Every answer includes sources, confidence,
                and links to relevant consoles.
              </p>
              <Link
                href="/admin/nexus/mission-control"
                className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[#e87a82] hover:text-[#f1c3c7]"
              >
                Open Platform Status →
              </Link>
            </div>
          ) : (
            turns.map((turn) => <ChatMessage key={turn.id} turn={turn} />)
          )}

          {loading ? (
            <div className="flex items-center gap-2 px-2 text-xs text-zinc-500">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#b4141e]" />
              Nexus is reviewing operational data…
            </div>
          ) : null}
        </div>

        <ChatInput
          value={draft}
          disabled={loading}
          onChange={setDraft}
          onSubmit={() => void sendMessage(draft)}
        />
      </div>
    </NexusSectionFrame>
  );
}
