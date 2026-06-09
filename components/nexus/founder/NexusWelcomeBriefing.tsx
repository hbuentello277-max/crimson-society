"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { WelcomeBriefing } from "@/lib/proactive-intelligence/types";
import { fetchNexusClientJson } from "@/lib/nexus/client-fetch";

const STORAGE_KEY = "nexus:welcome-briefing:dismissed-at";

function wasDismissedRecently(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  return Date.now() - dismissedAt < 6 * 60 * 60 * 1000;
}

export function NexusWelcomeBriefing() {
  const [briefing, setBriefing] = useState<WelcomeBriefing | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wasDismissedRecently()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchNexusClientJson<WelcomeBriefing>("/api/nexus/briefings/welcome");
        if (!cancelled) {
          setBriefing(payload);
          setVisible(true);
        }
      } catch {
        if (!cancelled) setVisible(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
    setVisible(false);
  }, []);

  if (loading || !visible || !briefing) return null;

  return (
    <section className="rounded-2xl border border-[#b4141e]/35 bg-gradient-to-r from-[#120608]/95 via-[#0a0608]/95 to-black/90 p-4 shadow-[0_20px_60px_-40px_rgba(180,20,30,0.8)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">NEXUS Welcome Briefing</p>
          <h2 className="mt-1 font-serif text-xl text-white sm:text-2xl">{briefing.greeting}</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Read-only summary · Launch readiness {briefing.launchReadinessScore}/100
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
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
    </section>
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
