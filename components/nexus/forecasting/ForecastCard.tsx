"use client";

import type { ForecastItem } from "@/lib/forecasting/types";
import { ProjectionTimeline } from "@/components/nexus/forecasting/ProjectionTimeline";
import { NexusPanel } from "@/components/nexus/NexusShared";

export function ForecastCard({ forecast }: { forecast: ForecastItem }) {
  return (
    <NexusPanel>
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">
            {forecast.category}
          </span>
          {!forecast.available ? (
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Unavailable
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <h3 className="break-words text-lg font-medium text-white">{forecast.title}</h3>
          <p className="mt-2 text-sm text-zinc-400">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Current · </span>
            {forecast.current_value}
          </p>
        </div>

        <ProjectionTimeline forecast={forecast} />

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricChip
            label="Confidence"
            value={forecast.confidence_score != null ? `${forecast.confidence_score}` : "—"}
          />
          <MetricChip label="Risk Score" value={`${forecast.risk_score}`} />
        </div>

        <p className="break-words text-sm leading-6 text-zinc-300">
          <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Recommendation ·{" "}
          </span>
          {forecast.recommendation}
        </p>
      </div>
    </NexusPanel>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
