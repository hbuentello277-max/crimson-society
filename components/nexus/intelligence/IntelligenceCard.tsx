"use client";

import type { IntelligenceItem } from "@/lib/intelligence/types";
import { formatRelativeTime } from "@/lib/nexus/format";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { NEXUS_PANEL_CLASS } from "@/components/nexus/NexusShared";

const CATEGORY_LABELS: Record<IntelligenceItem["category"], string> = {
  growth: "Growth",
  revenue: "Revenue",
  engagement: "Engagement",
  operations: "Operations",
  risk: "Risk",
  opportunity: "Opportunity",
};

export function IntelligenceCard({ item }: { item: IntelligenceItem }) {
  return (
    <article
      className={`${NEXUS_PANEL_CLASS} rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <NexusStatusBadge label={CATEGORY_LABELS[item.category]} variant="subtle" />
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          Impact {item.impact_score}
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          Confidence {item.confidence_score}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-7 text-white">{item.title}</h3>

      <p className="mt-3 text-sm leading-6 text-zinc-300">{item.summary}</p>

      <div className="mt-4 rounded-xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">Recommendation</p>
        <p className="mt-2 text-sm leading-6 text-zinc-100">{item.recommendation}</p>
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        Generated {formatRelativeTime(item.generated_at)}
      </p>
    </article>
  );
}
