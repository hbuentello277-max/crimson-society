"use client";

import { CORRELATION_CATEGORIES, type CorrelationCategory } from "@/lib/correlations/types";
import { NexusTabFilter } from "@/components/nexus/NexusShared";

export function CorrelationFilters({
  category,
  sort,
  window,
  counts,
  onCategoryChange,
  onSortChange,
  onWindowChange,
}: {
  category: CorrelationCategory | "all";
  sort: "impact" | "confidence";
  window: "24h" | "7d" | "30d";
  counts: Partial<Record<CorrelationCategory, number>>;
  onCategoryChange: (value: CorrelationCategory | "all") => void;
  onSortChange: (value: "impact" | "confidence") => void;
  onWindowChange: (value: "24h" | "7d" | "30d") => void;
}) {
  const categoryTabs = [
    { id: "all" as const, label: "All" },
    ...CORRELATION_CATEGORIES.map((type) => ({
      id: type,
      label: type.replaceAll("_", " "),
      count: counts[type],
    })),
  ];

  return (
    <div className="space-y-3">
      <NexusTabFilter tabs={categoryTabs} value={category} onChange={onCategoryChange} />

      <div className="flex flex-wrap gap-2">
        <FilterChip active={sort === "impact"} onClick={() => onSortChange("impact")} label="Sort: Impact" />
        <FilterChip
          active={sort === "confidence"}
          onClick={() => onSortChange("confidence")}
          label="Sort: Confidence"
        />
        <FilterChip active={window === "24h"} onClick={() => onWindowChange("24h")} label="24h" />
        <FilterChip active={window === "7d"} onClick={() => onWindowChange("7d")} label="7d" />
        <FilterChip active={window === "30d"} onClick={() => onWindowChange("30d")} label="30d" />
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition ${
        active
          ? "border-[#b4141e]/60 bg-[#b4141e]/15 text-[#f1c3c7]"
          : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}
