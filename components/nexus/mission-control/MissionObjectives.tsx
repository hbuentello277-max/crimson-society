"use client";

import Link from "next/link";
import type { MissionObjectiveView } from "@/lib/mission-control/types";
import { NexusListEmpty } from "@/components/nexus/NexusShared";
import { formatNexusDisplayText } from "@/lib/nexus/terminology";

const HORIZON_LABELS = {
  current: "Current",
  weekly: "Weekly",
  monthly: "Monthly",
} as const;

export function MissionObjectives({ objectives }: { objectives: MissionObjectiveView[] }) {
  if (objectives.length === 0) {
    return (
      <NexusListEmpty
        title="No objectives"
        description="Planning priorities and objectives will appear here when available."
      />
    );
  }

  const grouped = {
    current: objectives.filter((item) => item.horizon === "current"),
    weekly: objectives.filter((item) => item.horizon === "weekly"),
    monthly: objectives.filter((item) => item.horizon === "monthly"),
  };

  return (
    <div className="space-y-5">
      {(Object.keys(grouped) as Array<keyof typeof grouped>).map((horizon) => {
        const items = grouped[horizon];
        if (items.length === 0) return null;

        return (
          <div key={horizon} className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              {HORIZON_LABELS[horizon]} Objectives
            </p>
            {items.map((objective) => (
              <ObjectiveCard key={objective.id} objective={objective} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ObjectiveCard({ objective }: { objective: MissionObjectiveView }) {
  const trackLabel =
    objective.on_track === true
      ? "On track"
      : objective.on_track === false
        ? "Off track"
        : "Tracking";

  const trackTone =
    objective.on_track === true
      ? "text-emerald-400"
      : objective.on_track === false
        ? "text-amber-400"
        : "text-zinc-500";

  return (
    <article className="rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="break-words text-sm font-medium text-white">{formatNexusDisplayText(objective.title)}</p>
        <span className={`text-[10px] uppercase tracking-[0.14em] ${trackTone}`}>{trackLabel}</span>
      </div>
      <p className="mt-2 break-words text-sm leading-6 text-zinc-400">{formatNexusDisplayText(objective.summary)}</p>
      <p className="mt-2 break-words text-xs leading-5 text-zinc-500">
        {formatNexusDisplayText(objective.recommendation)}
      </p>
      {objective.related_routes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {objective.related_routes.map((route) => (
            <Link
              key={route}
              href={route}
              className="rounded-lg border border-[#b4141e]/30 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#e87a82] transition hover:bg-[#b4141e]/10"
            >
              {route.replace("/admin/nexus/", "")}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}
