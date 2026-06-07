"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { AnalysisInput } from "@/components/nexus/ai-analysis/AnalysisInput";
import { AnalysisResponse } from "@/components/nexus/ai-analysis/AnalysisResponse";
import { SuggestedPrompts } from "@/components/nexus/ai-analysis/SuggestedPrompts";
import { NexusSectionFrame } from "@/components/nexus/NexusShared";
import {
  useNexusScrollRestoration,
  useNexusStoredState,
} from "@/hooks/nexus/useNexusPageState";
import type { AnalysisSource } from "@/lib/ai-analysis/types";

type AnalysisTurn = {
  id: string;
  role: "owner" | "nexus";
  message: string;
  analysis?: string;
  sources?: AnalysisSource[];
  related_routes?: string[];
  confidence?: number;
};

type AnalysisApiPayload = {
  ok?: boolean;
  analysis?: string;
  confidence?: number;
  sources?: AnalysisSource[];
  related_routes?: string[];
  error?: string;
};

export function NexusAIAnalysisCenter() {
  const pageScrollRef = useNexusScrollRestoration("nexus:ai-analysis");
  const [turns, setTurns] = useNexusStoredState<AnalysisTurn[]>("nexus:ai-analysis:turns", []);
  const [draft, setDraft] = useNexusStoredState("nexus:ai-analysis:draft", "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const submitQuestion = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) {
      return;
    }

    const ownerTurn: AnalysisTurn = {
      id: `owner-${Date.now()}`,
      role: "owner",
      message: trimmed,
    };

    setTurns((current) => [...current, ownerTurn]);
    setDraft("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/nexus/ai-analysis", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const payload = (await response.json().catch(() => null)) as AnalysisApiPayload | null;

      if (!response.ok) {
        throw new Error(payload?.error || `Request failed (${response.status})`);
      }

      const nexusTurn: AnalysisTurn = {
        id: `nexus-${Date.now()}`,
        role: "nexus",
        message: trimmed,
        analysis: payload?.analysis || "Data unavailable.",
        sources: payload?.sources,
        related_routes: payload?.related_routes,
        confidence: payload?.confidence,
      };

      setTurns((current) => [...current, nexusTurn]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to run AI analysis.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }, [loading]);

  return (
    <div ref={pageScrollRef}>
      <NexusSectionFrame
        title="AI Analysis"
        description="AI-assisted explanations grounded in live Nexus data. Analysis only — no execution, no automation, no mutations."
        loading={false}
        error={error}
        onRefresh={async () => {
          setTurns([]);
          setError(null);
        }}
      >
        <div className="min-w-0 space-y-4 overflow-x-hidden">
        <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm leading-6 text-zinc-300">
          Ask why something changed, what deserves attention, or how to interpret forecasts and
          scenarios. Nexus AI explains using Mission Control, Copilot, Forecasting, and the full
          command stack — never inventing metrics or events.
        </div>

        <SuggestedPrompts
          disabled={loading}
          onSelect={(prompt) => {
            setDraft(prompt);
            void submitQuestion(prompt);
          }}
        />

        <div
          ref={scrollRef}
          className="max-h-[min(52vh,28rem)] min-h-[12rem] space-y-3 overflow-y-auto overflow-x-hidden rounded-2xl border border-[#b4141e]/20 bg-[#080506]/80 p-3 sm:p-4"
        >
          {turns.length === 0 ? (
            <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="font-serif text-lg text-white">Nexus AI Analysis</p>
              <p className="max-w-md text-sm leading-6 text-zinc-500">
                Explanations are grounded in operational data and include confidence, sources, and
                related console routes.
              </p>
              <Link
                href="/admin/nexus/chat"
                className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[#e87a82] hover:text-[#f1c3c7]"
              >
                Try deterministic Chat →
              </Link>
            </div>
          ) : (
            turns.map((turn) =>
              turn.role === "owner" ? (
                <div key={turn.id} className="flex justify-end">
                  <div className="max-w-[95%] rounded-2xl border border-[#b4141e]/40 bg-[#b4141e]/15 px-3 py-3 sm:max-w-[85%] sm:px-4">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-[#e87a82]">You</p>
                    <p className="mt-2 break-words text-sm leading-6 text-white">{turn.message}</p>
                  </div>
                </div>
              ) : (
                <AnalysisResponse key={turn.id} turn={turn} />
              ),
            )
          )}

          {loading ? (
            <div className="flex items-center gap-2 px-2 text-xs text-zinc-500">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#b4141e]" />
              Nexus AI is analyzing operational data…
            </div>
          ) : null}
        </div>

        <AnalysisInput
          value={draft}
          disabled={loading}
          onChange={setDraft}
          onSubmit={() => void submitQuestion(draft)}
        />
        </div>
      </NexusSectionFrame>
    </div>
  );
}
