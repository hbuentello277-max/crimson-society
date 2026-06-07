"use client";

import type { ScenarioComparisonRow } from "@/lib/scenarios/types";
import { scenarioTypeLabel } from "@/lib/scenarios/scoring";

export function ScenarioComparison({ rows }: { rows: ScenarioComparisonRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No scenario comparison available.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <ComparisonCard key={row.scenario_type} row={row} />
      ))}
    </div>
  );
}

function ComparisonCard({ row }: { row: ScenarioComparisonRow }) {
  const unavailable = !row.available;

  return (
    <article
      className={`rounded-xl border p-4 ${
        unavailable
          ? "border-zinc-700/40 bg-zinc-900/20"
          : "border-white/10 bg-black/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#e87a82]">
            {scenarioTypeLabel(row.scenario_type)}
          </p>
          <p className="mt-1 text-sm font-medium text-white">{row.title}</p>
        </div>
        {!unavailable ? (
          <span className="tabular-nums text-xs text-zinc-400">{row.scenario_score}</span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.12em] text-amber-400">N/A</span>
        )}
      </div>

      {unavailable ? (
        <p className="mt-3 text-sm text-zinc-500">Insufficient data</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.12em]">
          <CompareMetric label="Expected Benefit" value={row.expected_benefit} tone="benefit" />
          <CompareMetric label="Expected Risk" value={row.expected_risk} tone="risk" />
          <CompareMetric label="Confidence" value={row.confidence_score ?? "—"} />
          <CompareMetric label="Strategic Impact" value={row.strategic_impact} />
        </div>
      )}
    </article>
  );
}

function CompareMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "benefit" | "risk";
}) {
  const valueClass =
    tone === "benefit"
      ? "text-emerald-400"
      : tone === "risk"
        ? "text-amber-400"
        : "text-zinc-300";

  return (
    <div>
      <p className="text-zinc-600">{label}</p>
      <p className={`mt-0.5 tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}
