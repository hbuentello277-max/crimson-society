"use client";

import Link from "next/link";
import type { CopilotRisk } from "@/lib/copilot/types";
import { NexusPanel } from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";

export function RiskPanel({ risk }: { risk: CopilotRisk | null }) {
  if (!risk) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
        No major active risk pattern detected from current Nexus data.
      </div>
    );
  }

  return (
    <NexusPanel>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <NexusStatusBadge label={risk.severity} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Top Risk</span>
        </div>
        <p className="break-words text-lg font-medium text-white">{risk.title}</p>
        <p className="break-words text-sm leading-6 text-zinc-400">{risk.summary}</p>
        <p className="break-words text-sm text-zinc-300">
          <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Recommendation ·{" "}
          </span>
          {risk.recommendation}
        </p>
        <Link
          href={risk.related_route}
          className="inline-flex min-h-10 items-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7]"
        >
          Review Risk
        </Link>
      </div>
    </NexusPanel>
  );
}
