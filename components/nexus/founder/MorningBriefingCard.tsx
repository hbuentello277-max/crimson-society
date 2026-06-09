"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MorningBriefing } from "@/lib/proactive-intelligence/types";
import { fetchNexusClientJson } from "@/lib/nexus/client-fetch";

export function MorningBriefingCard() {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchNexusClientJson<MorningBriefing>("/api/nexus/briefings/morning");
        if (!cancelled) setBriefing(payload);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#b4141e]/20 bg-black/30 p-4">
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
      </section>
    );
  }

  if (!briefing) return null;

  return (
    <section className="rounded-2xl border border-[#b4141e]/25 bg-black/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">NEXUS Morning Briefing</p>
          <p className="mt-1 text-sm text-zinc-300">{briefing.headline}</p>
        </div>
        <div className="rounded-xl border border-[#b4141e]/35 bg-[#b4141e]/10 px-3 py-2 text-center">
          <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Launch readiness</p>
          <p className="mt-1 text-2xl font-semibold text-[#f1c3c7]">{briefing.launchReadiness.score}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {briefing.sections.map((section) => (
          <div key={section.label} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
            <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{section.label}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-200">{section.value}</p>
          </div>
        ))}
      </div>

      {briefing.priority.highestPriorityIssue ? (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-3">
          <p className="text-[9px] uppercase tracking-[0.18em] text-amber-200/80">Highest priority issue</p>
          <p className="mt-2 text-sm font-medium text-amber-50">
            {briefing.priority.highestPriorityIssue.title}
          </p>
          <p className="mt-1 text-sm text-amber-100/80">{briefing.priority.highestPriorityIssue.reason}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/nexus/alerts"
          className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300 transition hover:border-white/25"
        >
          Review alerts
        </Link>
        <Link
          href="/admin/nexus/copilot"
          className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20"
        >
          Founder copilot
        </Link>
      </div>
    </section>
  );
}
