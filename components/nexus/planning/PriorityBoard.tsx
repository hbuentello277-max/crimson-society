"use client";

import Link from "next/link";
import type { PlanningPriority } from "@/lib/planning/types";

const URGENCY_LABELS: Record<PlanningPriority["urgency"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const URGENCY_CLASS: Record<PlanningPriority["urgency"], string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-100",
  high: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  medium: "border-[#b4141e]/30 bg-[#b4141e]/8 text-[#f1c3c7]",
  low: "border-white/10 bg-black/30 text-zinc-300",
};

export function PriorityBoard({ priorities }: { priorities: PlanningPriority[] }) {
  const grouped = {
    critical: priorities.filter((item) => item.urgency === "critical"),
    high: priorities.filter((item) => item.urgency === "high"),
    medium: priorities.filter((item) => item.urgency === "medium"),
    low: priorities.filter((item) => item.urgency === "low"),
  };

  if (priorities.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-zinc-500">
        No strategic priorities generated from current Nexus data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(["critical", "high", "medium", "low"] as const).map((urgency) => {
        const items = grouped[urgency];
        if (items.length === 0) return null;

        return (
          <div key={urgency} className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              {URGENCY_LABELS[urgency]}
            </p>
            {items.map((item) => (
              <article key={item.id} className={`rounded-xl border p-4 ${URGENCY_CLASS[item.urgency]}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 opacity-90">{item.summary}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.14em] opacity-70">
                      {item.category} · Impact {item.impact_score} · Confidence {item.confidence_score}
                    </p>
                    <p className="mt-3 text-sm opacity-90">{item.recommendation}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {item.related_routes.slice(0, 2).map((route) => (
                      <Link
                        key={route}
                        href={route}
                        className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white"
                      >
                        Open
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        );
      })}
    </div>
  );
}
