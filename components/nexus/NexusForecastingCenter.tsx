"use client";

import { useMemo, useState } from "react";
import type { ForecastCategory, ForecastItem } from "@/lib/forecasting/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { ForecastCard } from "@/components/nexus/forecasting/ForecastCard";
import {
  filterForecasts,
  ForecastFilters,
} from "@/components/nexus/forecasting/ForecastFilters";
import { NexusListEmpty, NexusSectionFrame } from "@/components/nexus/NexusShared";

type ForecastingPayload = {
  ok?: boolean;
  generated_at?: string;
  summary?: {
    headline: string;
    available_count: number;
    unavailable_count: number;
    average_confidence: number | null;
    highest_risk_category: ForecastCategory | null;
  };
  forecasts?: ForecastItem[];
};

const SECTION_ORDER: Array<{ category: ForecastCategory; title: string; description: string }> = [
  {
    category: "membership",
    title: "Membership Forecast",
    description: "Where membership is heading on the current path",
  },
  {
    category: "revenue",
    title: "Revenue Forecast",
    description: "Estimated MRR trajectory from historical snapshots",
  },
  {
    category: "engagement",
    title: "Engagement Forecast",
    description: "Community activity index from posts, meets, and messages",
  },
  {
    category: "blackcard",
    title: "Blackcard Forecast",
    description: "Blackcard membership trajectory",
  },
  {
    category: "operational",
    title: "Operational Forecast",
    description: "Workflow and platform status outlook",
  },
  {
    category: "risk",
    title: "Risk Forecast",
    description: "Operational risk trajectory from Nexus signals",
  },
];

export function NexusForecastingCenter() {
  const [category, setCategory] = useState<ForecastCategory | "all">("all");
  const { data, error, loading, refresh } = useNexusFetch<ForecastingPayload>(
    "/api/nexus/forecasting",
  );

  const forecasts = data?.forecasts ?? [];
  const filtered = useMemo(
    () => filterForecasts(forecasts, category),
    [forecasts, category],
  );

  const byCategory = useMemo(() => {
    const map = new Map<ForecastCategory, ForecastItem>();
    for (const forecast of forecasts) {
      map.set(forecast.category, forecast);
    }
    return map;
  }, [forecasts]);

  return (
    <NexusSectionFrame
      title="Forecasting"
      description="Deterministic trend projections for Crimson Society. Mark I — read-only, no AI, no autonomous decisions."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading ? (
        <div className="min-w-0 space-y-8 overflow-x-hidden">
          <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm text-zinc-300">
            If Crimson Society continues on its current path, where will membership, Blackcard,
            revenue, engagement, operations, and risk likely be in 30, 90, and 180 days?
          </div>

          {data?.summary ? (
            <section className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">
                Forecast Summary
              </p>
              <p className="mt-3 break-words text-sm leading-7 text-zinc-200">
                {data.summary.headline}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SummaryChip label="Available" value={`${data.summary.available_count}`} />
                <SummaryChip
                  label="Avg Confidence"
                  value={
                    data.summary.average_confidence != null
                      ? `${data.summary.average_confidence}`
                      : "—"
                  }
                />
                <SummaryChip
                  label="Highest Risk"
                  value={data.summary.highest_risk_category ?? "—"}
                />
              </div>
            </section>
          ) : null}

          <ForecastFilters category={category} onCategoryChange={setCategory} />

          {category !== "all" ? (
            filtered.length === 0 ? (
              <NexusListEmpty
                title="Forecast unavailable"
                description="Not enough historical data exists for this category yet."
              />
            ) : (
              <div className="space-y-3">
                {filtered.map((forecast) => (
                  <ForecastCard key={forecast.id} forecast={forecast} />
                ))}
              </div>
            )
          ) : (
            <div className="space-y-8">
              {SECTION_ORDER.map((section) => {
                const forecast = byCategory.get(section.category);
                return (
                  <section key={section.category} className="min-w-0 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">
                        {section.title}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{section.description}</p>
                    </div>
                    {forecast ? (
                      <ForecastCard forecast={forecast} />
                    ) : (
                      <NexusListEmpty
                        title="Forecast unavailable"
                        description="Insufficient historical data for this category."
                      />
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-base font-medium text-white">{value}</p>
    </div>
  );
}
