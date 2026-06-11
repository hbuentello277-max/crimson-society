"use client";

import Link from "next/link";
import type { MissionThreat, MissionThreatSeverity } from "@/lib/mission-control/types";
import { NexusListEmpty } from "@/components/nexus/NexusShared";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

const SEVERITY_STYLES: Record<MissionThreatSeverity, string> = {
  critical: "border-red-500/30 bg-red-500/5 text-red-300",
  high: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  medium: "border-yellow-500/20 bg-yellow-500/5 text-yellow-200",
  low: "border-zinc-500/20 bg-zinc-500/5 text-zinc-400",
};

export function MissionThreats({ threats }: { threats: MissionThreat[] }) {
  if (threats.length === 0) {
    return (
      <NexusListEmpty
        title="No active threats"
        description="Platform threats are ranked from planning risks, operational drag, and declining signals."
      />
    );
  }

  return (
    <div className="space-y-2">
      {threats.map((threat) => (
        <article
          key={threat.id}
          className={`rounded-xl border p-3 sm:p-4 ${SEVERITY_STYLES[threat.severity]}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="break-words text-sm font-medium text-white">{formatNexusDisplayText(threat.title)}</p>
            <span className="text-[10px] uppercase tracking-[0.14em]">{threat.severity}</span>
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-zinc-400">{formatNexusDisplayText(threat.summary)}</p>
          <p className="mt-2 break-words text-xs leading-5 text-zinc-500">
            {formatNexusDisplayText(threat.recommendation)}
          </p>
          {threat.related_routes.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {threat.related_routes.map((route) => (
                <Link
                  key={route}
                  href={route}
                  className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-300 transition hover:bg-white/5"
                >
                  {route.replace("/admin/nexus/", "")}
                </Link>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
