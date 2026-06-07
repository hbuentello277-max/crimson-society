"use client";

import type { ScenarioRankings, StrategicScenario } from "@/lib/scenarios/types";
import { scenarioTypeLabel } from "@/lib/scenarios/scoring";

export function ScenarioRanking({
  rankings,
  ranked,
}: {
  rankings: ScenarioRankings;
  ranked: StrategicScenario[];
}) {
  const highlights = [
    { label: "Best Overall Scenario", scenario: rankings.best_overall },
    { label: "Highest Growth Scenario", scenario: rankings.highest_growth },
    { label: "Highest Revenue Scenario", scenario: rankings.highest_revenue },
    { label: "Lowest Risk Scenario", scenario: rankings.lowest_risk },
    { label: "Nexus Favored Path", scenario: rankings.nexus_favored },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {highlights.map((item) => (
          <RankingHighlight key={item.label} label={item.label} scenario={item.scenario} />
        ))}
      </div>

      {ranked.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                <th className="px-2 py-2 font-medium">Rank</th>
                <th className="px-2 py-2 font-medium">Scenario</th>
                <th className="px-2 py-2 font-medium">Score</th>
                <th className="px-2 py-2 font-medium">Benefit</th>
                <th className="px-2 py-2 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((scenario, index) => (
                <tr key={scenario.id} className="border-b border-white/5">
                  <td className="px-2 py-3 tabular-nums text-zinc-500">{index + 1}</td>
                  <td className="px-2 py-3">
                    <p className="font-medium text-white">{scenario.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{scenarioTypeLabel(scenario.scenario_type)}</p>
                  </td>
                  <td className="px-2 py-3 tabular-nums text-zinc-300">{scenario.scenario_score}</td>
                  <td className="px-2 py-3 tabular-nums text-emerald-400">{scenario.expected_benefit}</td>
                  <td className="px-2 py-3 tabular-nums text-amber-400">{scenario.expected_risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No ranked scenarios available.</p>
      )}
    </div>
  );
}

function RankingHighlight({
  label,
  scenario,
}: {
  label: string;
  scenario: StrategicScenario | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      {scenario ? (
        <>
          <p className="mt-2 break-words text-sm font-medium text-white">{scenario.title}</p>
          <p className="mt-1 break-words text-xs leading-5 text-zinc-400">{scenario.recommendation}</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
            Score {scenario.scenario_score} · Risk {scenario.expected_risk}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">Unavailable</p>
      )}
    </div>
  );
}
