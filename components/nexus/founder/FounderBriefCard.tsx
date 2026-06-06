"use client";

import type { FounderBrief } from "@/lib/nexus/founder-derive";

export function FounderBriefCard({ brief }: { brief: FounderBrief }) {
  const riskTone =
    brief.risk_level === "Critical"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : brief.risk_level === "High"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
        : brief.risk_level === "Medium"
          ? "border-[#b4141e]/30 bg-[#b4141e]/10 text-[#f1c3c7]"
          : "border-emerald-500/20 bg-emerald-500/5 text-emerald-100";

  return (
    <section className="rounded-2xl border border-[#b4141e]/25 bg-black/40 p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Founder Brief</p>
      <p className="mt-1 text-xs text-zinc-500">CEO morning briefing</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <BriefField label="Overall State" value={brief.overall_state} />
        <BriefField label="Top Focus" value={brief.top_focus} />
        <div className={`rounded-xl border px-3 py-3 ${riskTone}`}>
          <p className="text-[9px] uppercase tracking-[0.18em] opacity-80">Risk Level</p>
          <p className="mt-2 text-lg font-semibold">{brief.risk_level}</p>
        </div>
        <BriefField label="Recommended Next Step" value={brief.recommended_next_step} highlight />
      </div>
    </section>
  );
}

function BriefField({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        highlight ? "border-[#b4141e]/35 bg-[#b4141e]/5" : "border-white/10 bg-black/30"
      }`}
    >
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-200">{value}</p>
    </div>
  );
}
