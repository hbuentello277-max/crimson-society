"use client";

import type { FounderGuidanceBrief } from "@/lib/copilot/types";

export function FounderGuidanceCard({ guidance }: { guidance: FounderGuidanceBrief }) {
  return (
    <section className="rounded-2xl border border-[#b4141e]/25 bg-black/40 p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Founder Guidance</p>
      <p className="mt-3 break-words text-sm leading-7 text-zinc-200">{guidance.overall_status}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <GuidanceField label="Primary Focus" value={guidance.primary_focus} highlight />
        <GuidanceField label="Secondary Focus" value={guidance.secondary_focus} />
        <GuidanceField label="Largest Opportunity" value={guidance.largest_opportunity} />
        <GuidanceField label="Largest Risk" value={guidance.largest_risk} />
        <GuidanceField
          label="Recommended Next Step"
          value={guidance.recommended_next_step}
          highlight
          className="sm:col-span-2"
        />
      </div>
    </section>
  );
}

function GuidanceField({
  label,
  value,
  highlight = false,
  className = "",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        highlight ? "border-[#b4141e]/35 bg-[#b4141e]/5" : "border-white/10 bg-black/30"
      } ${className}`}
    >
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-zinc-200">{value}</p>
    </div>
  );
}
