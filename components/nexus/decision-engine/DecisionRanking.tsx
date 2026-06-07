"use client";

import type { DecisionRecommendation } from "@/lib/decision-engine/types";
import {
  computeRoiScore,
  decisionCategoryLabel,
  decisionPriorityLabel,
} from "@/lib/decision-engine/scoring";

const PRIORITY_TONE: Record<DecisionRecommendation["priority"], string> = {
  critical: "text-red-300",
  high: "text-amber-300",
  medium: "text-[#f1c3c7]",
  low: "text-zinc-400",
};

export function DecisionRanking({ rankings }: { rankings: DecisionRecommendation[] }) {
  if (rankings.length === 0) {
    return <p className="text-sm text-zinc-500">No ranked decisions available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            <th className="px-2 py-2 font-medium">Rank</th>
            <th className="px-2 py-2 font-medium">Decision</th>
            <th className="px-2 py-2 font-medium">Category</th>
            <th className="px-2 py-2 font-medium">Priority</th>
            <th className="px-2 py-2 font-medium">Score</th>
            <th className="px-2 py-2 font-medium">ROI</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((decision, index) => (
            <tr key={decision.id} className="border-b border-white/5">
              <td className="px-2 py-3 tabular-nums text-zinc-500">{index + 1}</td>
              <td className="max-w-[220px] px-2 py-3">
                <p className="break-words font-medium text-white">{decision.title}</p>
                <p className="mt-1 break-words text-xs leading-5 text-zinc-500">{decision.recommendation}</p>
              </td>
              <td className="px-2 py-3 text-xs uppercase tracking-[0.12em] text-zinc-400">
                {decisionCategoryLabel(decision.category)}
              </td>
              <td className={`px-2 py-3 text-xs uppercase tracking-[0.12em] ${PRIORITY_TONE[decision.priority]}`}>
                {decisionPriorityLabel(decision.priority)}
              </td>
              <td className="px-2 py-3 tabular-nums text-zinc-300">{decision.decision_score}</td>
              <td className="px-2 py-3 tabular-nums text-emerald-400">
                {computeRoiScore(decision.expected_impact, decision.effort_score)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
