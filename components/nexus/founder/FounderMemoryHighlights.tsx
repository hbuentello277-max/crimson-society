"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchNexusClientJson } from "@/lib/nexus/client-fetch";
import type { MemoryEntryDbRow } from "@/lib/memory/types";

type PhasePayload = {
  currentPhase: {
    phase_number: number;
    phase_name: string;
    status: string;
    summary: string;
  };
};

type MemoryPayload = {
  entries: MemoryEntryDbRow[];
};

export function FounderMemoryHighlights() {
  const [phase, setPhase] = useState<PhasePayload["currentPhase"] | null>(null);
  const [highlights, setHighlights] = useState<MemoryEntryDbRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [phasePayload, memoryPayload] = await Promise.all([
          fetchNexusClientJson<PhasePayload>("/api/nexus/memory/phases"),
          fetchNexusClientJson<MemoryPayload>("/api/nexus/memory?limit=40"),
        ]);

        if (cancelled) return;

        setPhase(phasePayload.currentPhase);
        const entries = memoryPayload.entries ?? [];
        const prioritized = [
          ...entries.filter((entry) => entry.metadata?.memory_category === "blocker"),
          ...entries.filter((entry) => entry.metadata?.memory_category === "decision"),
          ...entries.filter((entry) => entry.metadata?.nexus_phase === true),
        ];
        const deduped = new Map<string, MemoryEntryDbRow>();
        for (const entry of prioritized) {
          if (!deduped.has(entry.id)) deduped.set(entry.id, entry);
        }
        setHighlights([...deduped.values()].slice(0, 4));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || (!phase && highlights.length === 0)) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Founder Memory</p>
          {phase ? (
            <p className="mt-1 text-sm text-zinc-300">
              Phase {phase.phase_number}: {phase.phase_name} · {phase.status.replace(/_/g, " ")}
            </p>
          ) : null}
        </div>
        <Link
          href="/admin/nexus/memory"
          className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300 transition hover:border-white/25"
        >
          View memory
        </Link>
      </div>

      {highlights.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {highlights.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm leading-6 text-zinc-200"
            >
              <p className="font-medium text-white">{entry.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {(entry.metadata?.memory_category as string | undefined)?.replace(/_/g, " ") ??
                  entry.entry_type}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          Capture decisions and blockers with NEXUS Voice: “Remember that…” or “Save this decision…”
        </p>
      )}
    </section>
  );
}
