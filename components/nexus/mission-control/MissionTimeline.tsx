"use client";

import type { MissionHistoryItem } from "@/lib/mission-control/types";
import { formatDateTime } from "@/lib/nexus/format";
import { NexusListEmpty } from "@/components/nexus/NexusShared";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

const TYPE_LABELS: Record<string, string> = {
  milestone: "Milestone",
  deployment: "Deployment",
  incident: "Incident",
  report: "Report",
  briefing: "Briefing",
};

export function MissionTimeline({ history }: { history: MissionHistoryItem[] }) {
  if (history.length === 0) {
    return (
      <NexusListEmpty
        title="No platform history"
        description="Milestones, deployments, incidents, reports, and briefings from Memory appear here."
      />
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-[#b4141e]/20 pl-4">
      {history.map((item, index) => (
        <li key={item.id} className="relative pb-4 last:pb-0">
          <span
            aria-hidden
            className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full border border-[#b4141e]/50 bg-[#b4141e]/30"
          />
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#e87a82]">
                {TYPE_LABELS[item.entry_type] ?? item.entry_type}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                {formatDateTime(item.occurred_at)}
              </span>
            </div>
            <p className="mt-2 break-words text-sm font-medium text-white">{formatNexusDisplayText(item.title)}</p>
            <p className="mt-1 break-words text-sm leading-6 text-zinc-400">{formatNexusDisplayText(item.summary)}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              Source {item.source}
              {index === 0 ? " · Latest" : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
