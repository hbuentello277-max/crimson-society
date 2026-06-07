"use client";

import type { ForecastCategory } from "@/lib/forecasting/types";
import { FORECAST_CATEGORIES } from "@/lib/forecasting/types";
import { NexusTabFilter } from "@/components/nexus/NexusShared";

export function ForecastFilters({
  category,
  onCategoryChange,
}: {
  category: ForecastCategory | "all";
  onCategoryChange: (value: ForecastCategory | "all") => void;
}) {
  const tabs = [
    { id: "all" as const, label: "All", count: undefined },
    ...FORECAST_CATEGORIES.map((value) => ({
      id: value,
      label: value,
      count: undefined,
    })),
  ];

  return (
    <NexusTabFilter tabs={tabs} value={category} onChange={onCategoryChange} />
  );
}

export function filterForecasts<T extends { category: ForecastCategory }>(
  forecasts: T[],
  category: ForecastCategory | "all",
) {
  if (category === "all") return forecasts;
  return forecasts.filter((forecast) => forecast.category === category);
}
