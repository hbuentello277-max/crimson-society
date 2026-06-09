"use client";

import Link from "next/link";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { NexusLoadingPanel } from "@/components/nexus/NexusShared";
import type {
  CrossSystemInsight,
  FounderIntelligenceBriefing,
} from "@/lib/cross-system-intelligence/types";

type BriefingPayload = FounderIntelligenceBriefing & { ok?: boolean };

function InsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: CrossSystemInsight[];
  tone: "risk" | "opportunity";
}) {
  const border =
    tone === "risk"
      ? "border-[#b4141e]/35 bg-[#b4141e]/5"
      : "border-emerald-500/25 bg-emerald-950/20";

  return (
    <div className={`rounded-xl border px-3 py-3 ${border}`}>
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No items detected.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="text-sm leading-6 text-zinc-200">
              <p className="font-medium text-white">{item.title}</p>
              <p className="text-zinc-400">{item.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PlatformIntelligenceSection() {
  const { data, error, loading, refresh } = useNexusFetch<BriefingPayload>(
    "/api/nexus/intelligence/founder-briefing",
  );

  if (loading) {
    return <NexusLoadingPanel rows={2} />;
  }

  if (error || !data?.headline) {
    return (
      <section className="rounded-2xl border border-[#b4141e]/25 bg-black/40 p-4">
        <p className="text-sm text-amber-200">Platform Intelligence is temporarily unavailable.</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#b4141e]/30 bg-gradient-to-r from-[#120608]/90 via-[#0a0608]/90 to-black/90 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Platform Intelligence</p>
          <h2 className="mt-1 font-serif text-xl text-white sm:text-2xl">{data.headline}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{data.narrative}</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <InsightList title="Top risks" items={data.top_risks.slice(0, 3)} tone="risk" />
        <InsightList title="Top opportunities" items={data.top_opportunities.slice(0, 3)} tone="opportunity" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
          <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Top correlations</p>
          {data.top_correlations.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No cross-system patterns matched current data.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-zinc-300">
              {data.top_correlations.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <p className="font-medium text-white">{item.title}</p>
                  <p>{item.explanation}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
          <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Recent events</p>
          {data.recent_events.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No major events in the current window.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-zinc-300">
              {data.recent_events.slice(0, 5).map((event) => (
                <li key={event.id}>
                  <span className="text-[#e87a82]">{event.category.replaceAll("_", " ")}</span>
                  <span className="text-white"> · {event.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {data.recommended_actions.length > 0 ? (
        <div className="mt-3 rounded-xl border border-[#b4141e]/25 bg-[#b4141e]/5 px-3 py-3">
          <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Recommended actions</p>
          <ul className="mt-2 space-y-2 text-sm text-zinc-200">
            {data.recommended_actions.slice(0, 3).map((item) => (
              <li key={item.id}>
                <span className="font-medium text-white">{item.title}</span>
                <span className="text-zinc-400"> — {item.reason}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-500">Approval required. No automatic execution.</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/nexus/intelligence"
          className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300 transition hover:border-white/25"
        >
          Intelligence center
        </Link>
        <Link
          href="/admin/nexus/actions"
          className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20"
        >
          Action Center
        </Link>
      </div>
    </section>
  );
}
