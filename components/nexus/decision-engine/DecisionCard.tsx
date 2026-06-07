"use client";

import Link from "next/link";
import type { DecisionRecommendation } from "@/lib/decision-engine/types";
import { decisionCategoryLabel, decisionPriorityLabel } from "@/lib/decision-engine/scoring";

const PRIORITY_BORDER: Record<DecisionRecommendation["priority"], string> = {
  critical: "border-red-500/25 bg-red-500/5",
  high: "border-amber-500/25 bg-amber-500/5",
  medium: "border-[#b4141e]/20 bg-[#b4141e]/5",
  low: "border-white/10 bg-black/30",
};

export function DecisionCard({ decision }: { decision: DecisionRecommendation }) {
  return (
    <article className={`rounded-xl border p-3 sm:p-4 ${PRIORITY_BORDER[decision.priority]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#e87a82]">
            {decisionCategoryLabel(decision.category)}
          </p>
          <p className="mt-1 break-words text-sm font-medium text-white">{decision.title}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          {decisionPriorityLabel(decision.priority)}
        </span>
      </div>

      <p className="mt-2 break-words text-sm leading-6 text-zinc-400">{decision.summary}</p>
      <p className="mt-2 break-words text-xs leading-5 text-zinc-500">{decision.reasoning}</p>
      <p className="mt-3 break-words text-sm leading-6 text-zinc-200">{decision.recommendation}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600 sm:grid-cols-4">
        <Metric label="Impact" value={decision.expected_impact} />
        <Metric label="Urgency" value={decision.urgency_score} />
        <Metric label="Confidence" value={decision.confidence_score} />
        <Metric label="Effort" value={decision.effort_score} />
      </div>

      {decision.related_routes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {decision.related_routes.map((route) => (
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="text-zinc-600">{label}</span>
      <p className="mt-0.5 tabular-nums text-zinc-400">{value}</p>
    </div>
  );
}

export function DecisionCardList({ decisions }: { decisions: DecisionRecommendation[] }) {
  if (decisions.length === 0) {
    return <p className="text-sm text-zinc-500">No decisions available from current Nexus signals.</p>;
  }

  return (
    <div className="space-y-2">
      {decisions.map((decision) => (
        <DecisionCard key={decision.id} decision={decision} />
      ))}
    </div>
  );
}
