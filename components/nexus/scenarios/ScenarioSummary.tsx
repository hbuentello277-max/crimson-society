"use client";

import type { ScenarioBrief } from "@/lib/scenarios/types";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

export function ScenarioSummary({ brief, available }: { brief: ScenarioBrief; available: boolean }) {
  return (
    <section className="rounded-2xl border border-[#b4141e]/25 bg-black/40 p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Scenario Summary</p>
      <p className="mt-1 text-xs text-zinc-500">Deterministic path comparison — no AI, no ML</p>

      {!available ? (
        <p className="mt-4 text-sm leading-7 text-amber-300">{formatNexusDisplayText(brief.headline)}</p>
      ) : (
        <>
          <p className="mt-4 break-words text-sm leading-7 text-zinc-200">
            {formatNexusDisplayText(brief.headline)}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryField label="Strongest Path" value={brief.strongest_path} highlight />
            <SummaryField label="Nexus Favored Path" value={brief.favored_path} highlight />
            <SummaryField label="Riskiest Path" value={brief.riskiest_path} tone="risk" />
            <SummaryField label="Tradeoffs" value={brief.tradeoff_summary} className="sm:col-span-2" />
          </div>
        </>
      )}
    </section>
  );
}

function SummaryField({
  label,
  value,
  highlight = false,
  tone = "neutral",
  className = "",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "neutral" | "risk";
  className?: string;
}) {
  const border =
    tone === "risk"
      ? "border-amber-500/25 bg-amber-500/5"
      : highlight
        ? "border-[#b4141e]/35 bg-[#b4141e]/5"
        : "border-white/10 bg-black/30";

  return (
    <div className={`rounded-xl border px-3 py-3 ${border} ${className}`}>
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-zinc-200">{formatNexusDisplayText(value)}</p>
    </div>
  );
}
