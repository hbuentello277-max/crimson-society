"use client";

import type { DecisionBrief } from "@/lib/decision-engine/types";

export function DecisionBriefPanel({ brief }: { brief: DecisionBrief }) {
  return (
    <section className="rounded-2xl border border-[#b4141e]/25 bg-black/40 p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Executive Decision Brief</p>
      <p className="mt-1 text-xs text-zinc-500">Rule-based strategic summary — no AI</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <BriefField label="Best Decision Now" value={brief.best_decision_now} highlight />
        <BriefField label="Highest ROI Focus" value={brief.highest_roi_focus} highlight />
        <BriefField label="Biggest Opportunity" value={brief.biggest_opportunity} tone="opportunity" />
        <BriefField label="Biggest Risk" value={brief.biggest_risk} tone="risk" />
        <BriefField
          label="Founder Recommendation"
          value={brief.founder_recommendation}
          highlight
          className="sm:col-span-2"
        />
      </div>
    </section>
  );
}

function BriefField({
  label,
  value,
  highlight = false,
  tone = "neutral",
  className = "",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "neutral" | "risk" | "opportunity";
  className?: string;
}) {
  const border =
    tone === "risk"
      ? "border-amber-500/25 bg-amber-500/5"
      : tone === "opportunity"
        ? "border-emerald-500/25 bg-emerald-500/5"
        : highlight
          ? "border-[#b4141e]/35 bg-[#b4141e]/5"
          : "border-white/10 bg-black/30";

  return (
    <div className={`rounded-xl border px-3 py-3 ${border} ${className}`}>
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-zinc-200">{value}</p>
    </div>
  );
}
