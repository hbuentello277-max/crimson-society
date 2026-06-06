"use client";

import type { MonthlyOwnerBriefing } from "@/lib/briefings/types";
import { formatMonthlyBriefingPlainText } from "@/lib/briefings/plain-text";
import { formatDateTime } from "@/lib/nexus/format";
import { BriefingSectionBlock } from "@/components/nexus/briefings/BriefingSection";
import { NEXUS_PANEL_CLASS } from "@/components/nexus/NexusShared";

const CARD_CLASS = `${NEXUS_PANEL_CLASS} rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5`;

export function MonthlyBriefingCard({
  briefing,
  onCopy,
  copyState,
}: {
  briefing: MonthlyOwnerBriefing;
  onCopy: () => void;
  copyState: "idle" | "copied" | "error";
}) {
  return (
    <article className={`${CARD_CLASS} space-y-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Monthly Owner Briefing</p>
          <p className="mt-1 text-xs text-zinc-500">
            {formatDateTime(briefing.period_start)} → {formatDateTime(briefing.period_end)}
          </p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-lg border border-[#b4141e]/40 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20"
        >
          {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy Failed" : "Copy Monthly Briefing"}
        </button>
      </div>

      <div className="rounded-xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Headline</p>
        <p className="mt-2 text-base font-medium leading-7 text-white sm:text-lg">{briefing.headline}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <BriefingSectionBlock section={briefing.growth_summary} />
        <BriefingSectionBlock section={briefing.revenue_summary} />
        <BriefingSectionBlock section={briefing.engagement_summary} />
        <BriefingSectionBlock section={briefing.operations_summary} />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-amber-200/80">Risks</p>
        <ul className="space-y-2">
          {briefing.risks.map((risk) => (
            <li key={risk} className="text-sm text-amber-100/90">
              {risk}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">Recommended Focus</p>
        <ul className="space-y-2">
          {briefing.recommended_focus.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-zinc-200">
              <span className="text-[#e87a82]">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
        Generated {formatDateTime(briefing.generated_at)}
      </p>
    </article>
  );
}

export function monthlyBriefingPlainText(briefing: MonthlyOwnerBriefing) {
  return formatMonthlyBriefingPlainText(briefing);
}
