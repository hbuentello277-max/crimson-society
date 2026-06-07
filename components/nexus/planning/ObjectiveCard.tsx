"use client";

import Link from "next/link";
import type { PlanningObjective } from "@/lib/planning/types";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";

const CATEGORY_LABELS: Record<PlanningObjective["category"], string> = {
  growth: "Growth",
  revenue: "Revenue",
  engagement: "Engagement",
  community: "Community",
  operations: "Operations",
  risk: "Risk",
};

export function ObjectiveCard({ objective }: { objective: PlanningObjective }) {
  const trackLabel =
    objective.on_track === true
      ? "On track"
      : objective.on_track === false
        ? "Off track"
        : "Tracking";

  const trackClass =
    objective.on_track === true
      ? "text-emerald-300"
      : objective.on_track === false
        ? "text-amber-300"
        : "text-zinc-400";

  return (
    <article className="rounded-2xl border border-[#b4141e]/20 bg-[#0a0608]/80 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <NexusStatusBadge label={CATEGORY_LABELS[objective.category]} variant="subtle" />
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          {objective.horizon}
        </span>
        <span className={`text-[10px] uppercase tracking-[0.14em] ${trackClass}`}>{trackLabel}</span>
      </div>

      <h3 className="mt-3 text-base font-semibold text-white">{objective.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{objective.summary}</p>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        <span>Impact {objective.impact_score}</span>
        <span>Confidence {objective.confidence_score}</span>
      </div>

      <div className="mt-4 rounded-xl border border-[#b4141e]/15 bg-black/30 p-3">
        <p className="text-[9px] uppercase tracking-[0.16em] text-[#e87a82]">Recommendation</p>
        <p className="mt-2 text-sm text-zinc-200">{objective.recommendation}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {objective.related_routes.map((route) => (
          <Link
            key={route}
            href={route}
            className="rounded-lg border border-[#b4141e]/25 bg-[#b4141e]/5 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[#f1c3c7]"
          >
            {route.replace("/admin/nexus/", "").replaceAll("-", " ")}
          </Link>
        ))}
      </div>
    </article>
  );
}
