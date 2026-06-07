"use client";

import Link from "next/link";
import type { CopilotOpportunity } from "@/lib/copilot/types";
import { NexusPanel } from "@/components/nexus/NexusShared";

export function OpportunityPanel({ opportunity }: { opportunity: CopilotOpportunity | null }) {
  if (!opportunity) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
        No supported opportunity pattern detected from current Nexus data.
      </div>
    );
  }

  return (
    <NexusPanel>
      <div className="min-w-0 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">Top Opportunity</p>
        <p className="break-words text-lg font-medium text-white">{opportunity.title}</p>
        <p className="break-words text-sm leading-6 text-zinc-400">{opportunity.summary}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricChip label="Confidence" value={`${opportunity.confidence_score}`} />
          <MetricChip label="Impact" value={`${opportunity.impact_score}`} />
        </div>
        <p className="break-words text-sm text-zinc-300">
          <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Recommendation ·{" "}
          </span>
          {opportunity.recommendation}
        </p>
        <Link
          href={opportunity.related_route}
          className="inline-flex min-h-10 items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-emerald-100"
        >
          Explore Opportunity
        </Link>
      </div>
    </NexusPanel>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
