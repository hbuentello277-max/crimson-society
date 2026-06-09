"use client";

import type { ExecutiveCommandSummary } from "@/lib/executive-command/types";

export function TodaysFocusStrip({
  summary,
  loading,
}: {
  summary: ExecutiveCommandSummary | null | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-[#b4141e]/25 bg-[#060405]/95 p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#e87a82]">Today&apos;s Focus</p>
        <p className="mt-2 text-sm text-zinc-500">Loading founder signals…</p>
      </section>
    );
  }

  const exec = summary?.executive_summary;
  const topPriority = summary?.todays_priorities[0];
  const pending = summary?.action_center.pending_approvals ?? 0;

  return (
    <section className="rounded-2xl border border-[#b4141e]/30 bg-gradient-to-br from-[#120608]/95 to-[#060405]/95 p-4 shadow-[0_0_24px_rgba(180,20,30,0.08)]">
      <p className="text-[10px] uppercase tracking-[0.24em] text-[#e87a82]">Today&apos;s Focus</p>

      <div className="mt-3 space-y-2">
        <p className="text-base font-medium leading-snug text-white">
          {topPriority?.title ?? exec?.recommended_focus_today ?? "Review platform signals"}
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Biggest risk</p>
            <p className="mt-1 line-clamp-2 text-zinc-200">
              {exec?.top_risk?.title ?? "None flagged"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Biggest opportunity</p>
            <p className="mt-1 line-clamp-2 text-zinc-200">
              {exec?.top_opportunity?.title ?? "None flagged"}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Launch readiness</p>
            <p className="mt-1 font-semibold text-white">
              {exec?.launch_readiness_score ?? "—"} / 100
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Pending approvals</p>
            <p className="mt-1 font-semibold text-white">{pending}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
