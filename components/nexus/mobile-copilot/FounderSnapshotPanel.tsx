"use client";

import type { ExecutiveFounderMemory } from "@/lib/executive-command/types";
import { NEXUS_MOBILE_COPILOT_PHASE } from "@/lib/mobile-copilot/types";

export function FounderSnapshotPanel({
  memory,
}: {
  memory: ExecutiveFounderMemory | null | undefined;
}) {
  const phase = memory?.current_nexus_phase ?? NEXUS_MOBILE_COPILOT_PHASE;
  const blockers = memory?.current_blockers ?? [];
  const decisions = memory?.recent_decisions ?? [];
  const milestone = memory?.completed_milestones[0] ?? null;

  return (
    <details className="group overflow-hidden rounded-2xl border border-[#b4141e]/20 bg-[#060405]/90">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 marker:content-none">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">Founder Snapshot</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 group-open:hidden">Open</span>
        <span className="hidden text-[10px] uppercase tracking-[0.12em] text-zinc-500 group-open:inline">
          Close
        </span>
      </summary>
      <div className="space-y-3 border-t border-[#b4141e]/15 px-4 py-3 text-sm">
        <p className="text-zinc-400">
          Current phase: <span className="text-white">Phase {phase}</span>
        </p>
        <div>
          <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Active blockers</p>
          {blockers.length === 0 ? (
            <p className="mt-1 text-zinc-500">No active blockers in memory.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {blockers.slice(0, 3).map((item) => (
                <li key={item.id} className="text-zinc-200">
                  {item.title}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Recent decisions</p>
          {decisions.length === 0 ? (
            <p className="mt-1 text-zinc-500">No recent decisions logged.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {decisions.slice(0, 3).map((item) => (
                <li key={item.id} className="text-zinc-200">
                  {item.title}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Latest milestone</p>
          <p className="mt-1 text-zinc-200">{milestone?.title ?? "No recent milestone recorded."}</p>
        </div>
      </div>
    </details>
  );
}
