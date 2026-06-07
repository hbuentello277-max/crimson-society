"use client";

import type { FounderPlanningBrief } from "@/lib/planning/types";

export function PlanningBriefCard({ brief }: { brief: FounderPlanningBrief }) {
  return (
    <section className="rounded-2xl border border-[#b4141e]/25 bg-black/40 p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Strategic Planning Brief</p>
      <p className="mt-1 text-xs text-zinc-500">Owner focus for this planning cycle</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <BriefField label="Overall Direction" value={brief.overall_direction} highlight />
        <BriefField label="Primary Focus" value={brief.primary_focus} />
        <BriefField label="Secondary Focus" value={brief.secondary_focus} />
        <BriefField label="Biggest Opportunity" value={brief.biggest_opportunity} />
        <BriefField label="Biggest Risk" value={brief.biggest_risk} />
        <BriefField label="Next Recommended Action" value={brief.next_recommended_action} highlight />
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
