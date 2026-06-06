"use client";

import type { IntelligenceCategory } from "@/lib/intelligence/types";
import { INTELLIGENCE_CATEGORIES } from "@/lib/intelligence/types";

const CATEGORY_LABELS: Record<IntelligenceCategory, string> = {
  growth: "Growth",
  revenue: "Revenue",
  engagement: "Engagement",
  operations: "Operations",
  risk: "Risk",
  opportunity: "Opportunity",
};

export function IntelligenceFilters({
  category,
  sort,
  counts,
  onCategoryChange,
  onSortChange,
}: {
  category: IntelligenceCategory | "all";
  sort: "impact" | "confidence";
  counts: Partial<Record<IntelligenceCategory, number>>;
  onCategoryChange: (value: IntelligenceCategory | "all") => void;
  onSortChange: (value: "impact" | "confidence") => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip
          active={category === "all"}
          label="All"
          onClick={() => onCategoryChange("all")}
        />
        {INTELLIGENCE_CATEGORIES.map((id) => (
          <FilterChip
            key={id}
            active={category === id}
            label={`${CATEGORY_LABELS[id]}${counts[id] ? ` (${counts[id]})` : ""}`}
            onClick={() => onCategoryChange(id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <SortChip active={sort === "impact"} label="Sort: Impact" onClick={() => onSortChange("impact")} />
        <SortChip
          active={sort === "confidence"}
          label="Sort: Confidence"
          onClick={() => onSortChange("confidence")}
        />
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg border px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition ${
        active
          ? "border-[#b4141e]/70 bg-[#b4141e]/25 text-[#f1c3c7]"
          : "border-[#b4141e]/20 bg-black/40 text-zinc-400 hover:border-[#b4141e]/40 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

function SortChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition ${
        active
          ? "border-white/20 bg-white/10 text-white"
          : "border-white/10 bg-black/30 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}
