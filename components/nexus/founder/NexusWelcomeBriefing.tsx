"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useNexusStoredState } from "@/hooks/nexus/useNexusPageState";
import { buildFounderGreeting } from "@/lib/nexus/founder-greeting";
import { fetchNexusClientJson } from "@/lib/nexus/client-fetch";
import type { WelcomeBriefing } from "@/lib/proactive-intelligence/types";
import { RecommendedPlanBanner } from "@/components/nexus/founder/RecommendedPlanBanner";

const EXPANDED_STORAGE_KEY = "nexus:briefing:expanded";

export function NexusWelcomeBriefing() {
  const { profile } = useAuth();
  const [briefing, setBriefing] = useState<WelcomeBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useNexusStoredState(EXPANDED_STORAGE_KEY, false);
  const [greetingTick, setGreetingTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchNexusClientJson<WelcomeBriefing>("/api/nexus/briefings/welcome");
        if (!cancelled) {
          setBriefing(payload);
        }
      } catch {
        if (!cancelled) setBriefing(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setGreetingTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const greeting = useMemo(
    () =>
      buildFounderGreeting({
        display_name: profile?.display_name,
        username: profile?.username,
      }),
    [profile?.display_name, profile?.username, greetingTick],
  );

  if (loading || !briefing) return null;

  return (
  <>
    <RecommendedPlanBanner />
    <section className="rounded-2xl border border-[#b4141e]/35 bg-gradient-to-r from-[#120608]/95 via-[#0a0608]/95 to-black/90 shadow-[0_20px_60px_-40px_rgba(180,20,30,0.8)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className={`flex w-full items-start justify-between gap-3 text-left transition ${
          expanded ? "p-4 sm:p-5" : "px-3 py-2.5 sm:px-4 sm:py-3"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">NEXUS Briefing</p>
          <h2 className="mt-0.5 font-serif text-lg leading-tight text-white sm:mt-1 sm:text-xl">{greeting}</h2>
          <p className="mt-0.5 text-xs text-zinc-400 sm:mt-1">
            Launch readiness {briefing.launchReadinessScore}/100
          </p>
        </div>
        <span
          aria-hidden
          className="mt-1 shrink-0 text-sm text-[#e87a82] transition-transform"
        >
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-[#b4141e]/20 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <div className="grid gap-3 lg:grid-cols-3">
            <BriefingColumn title="What changed" items={briefing.whatChanged} />
            <BriefingColumn title="Needs attention" items={briefing.needsAttention} highlight />
            <BriefingColumn title="Recommended actions" items={briefing.recommendedActions} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/nexus/briefings"
              className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20"
            >
              Morning briefing
            </Link>
            <Link
              href="/admin/nexus/mission-control"
              className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300 transition hover:border-white/25"
            >
              Launch readiness
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  </>
  );
}

function BriefingColumn({
  title,
  items,
  highlight = false,
}: {
  title: string;
  items: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        highlight ? "border-[#b4141e]/35 bg-[#b4141e]/5" : "border-white/10 bg-black/30"
      }`}
    >
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-200">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-[#e87a82]">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
