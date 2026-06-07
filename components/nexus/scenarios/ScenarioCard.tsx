"use client";

import type { StrategicScenario } from "@/lib/scenarios/types";
import { scenarioTypeLabel } from "@/lib/scenarios/scoring";

export function ScenarioCard({ scenario }: { scenario: StrategicScenario }) {
  if (!scenario.available) {
    return (
      <article className="rounded-xl border border-zinc-700/40 bg-zinc-900/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          {scenarioTypeLabel(scenario.scenario_type)}
        </p>
        <p className="mt-2 text-sm font-medium text-zinc-400">{scenario.title}</p>
        <p className="mt-2 text-sm text-zinc-500">{scenario.summary}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.12em] text-amber-400">Unavailable</p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#e87a82]">
            {scenarioTypeLabel(scenario.scenario_type)}
          </p>
          <p className="mt-1 break-words text-sm font-medium text-white">{scenario.title}</p>
        </div>
        <span className="tabular-nums text-[10px] uppercase tracking-[0.14em] text-zinc-400">
          Score {scenario.scenario_score}
        </span>
      </div>

      <p className="mt-2 break-words text-sm leading-6 text-zinc-400">{scenario.summary}</p>
      <p className="mt-3 break-words text-sm leading-6 text-zinc-200">{scenario.recommendation}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ProjectionList title="Projected Benefits" items={scenario.projected_benefits} tone="benefit" />
        <ProjectionList title="Projected Risks" items={scenario.projected_risks} tone="risk" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600 sm:grid-cols-4">
        <Metric label="Benefit" value={scenario.expected_benefit} />
        <Metric label="Risk" value={scenario.expected_risk} />
        <Metric label="Confidence" value={scenario.confidence_score ?? "—"} />
        <Metric label="Impact" value={scenario.strategic_impact} />
      </div>
    </article>
  );
}

function ProjectionList({
  title,
  items,
  tone,
}: {
  title: string;
  items: StrategicScenario["projected_benefits"];
  tone: "benefit" | "risk";
}) {
  const border = tone === "benefit" ? "border-emerald-500/20" : "border-amber-500/20";

  return (
    <div className={`rounded-lg border ${border} p-3`}>
      <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={`${title}-${item.label}`}>
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">{item.label}</p>
            <p className="mt-0.5 break-words text-sm leading-5 text-zinc-300">{item.value}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <span className="text-zinc-600">{label}</span>
      <p className="mt-0.5 tabular-nums text-zinc-400">{value}</p>
    </div>
  );
}
