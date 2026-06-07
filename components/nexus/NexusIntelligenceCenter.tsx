"use client";

import { useMemo } from "react";
import type { IntelligenceCategory, IntelligenceItem, IntelligenceSummary } from "@/lib/intelligence/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import {
  useNexusScrollRestoration,
  useNexusStoredState,
} from "@/hooks/nexus/useNexusPageState";
import { IntelligenceCard } from "@/components/nexus/intelligence/IntelligenceCard";
import { IntelligenceFilters } from "@/components/nexus/intelligence/IntelligenceFilters";
import { NexusListEmpty, NexusSectionFrame } from "@/components/nexus/NexusShared";

type IntelligencePayload = IntelligenceSummary & { ok?: boolean };

export function NexusIntelligenceCenter() {
  const { ref: scrollRef } = useNexusScrollRestoration("nexus:intelligence");
  const [category, setCategory] = useNexusStoredState<IntelligenceCategory | "all">(
    "nexus:intelligence:category",
    "all",
  );
  const [sort, setSort] = useNexusStoredState<"impact" | "confidence">(
    "nexus:intelligence:sort",
    "impact",
  );

  const path = `/api/nexus/intelligence?sort=${sort}`;
  const { data, error, loading, refresh } = useNexusFetch<IntelligencePayload>(path);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (category === "all") return all;
    return all.filter((item) => item.category === category);
  }, [category, data?.items]);

  const sortedItems = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      if (sort === "confidence") {
        return b.confidence_score - a.confidence_score || b.impact_score - a.impact_score;
      }
      return b.impact_score - a.impact_score || b.confidence_score - a.confidence_score;
    });
    return copy;
  }, [items, sort]);

  return (
    <div ref={scrollRef}>
      <NexusSectionFrame
        title="Intelligence"
        description="Deterministic patterns, correlations, and opportunities from Nexus data. Mark I — read-only, no AI or execution."
        loading={loading}
        error={error}
        onRefresh={refresh}
      >
      {!loading ? (
        <>
          <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm text-zinc-300">
            Intelligence items are generated from metrics snapshots, workflow checks, alerts,
            incidents, observations, and activity signals. Items appear only when data supports
            the conclusion.
          </div>

          <IntelligenceFilters
            category={category}
            sort={sort}
            counts={data?.counts ?? {}}
            onCategoryChange={setCategory}
            onSortChange={setSort}
          />

          {sortedItems.length === 0 ? (
            <NexusListEmpty
              title="No intelligence items"
              description={
                category === "all"
                  ? "No supported patterns were detected from current Nexus data."
                  : `No ${category} intelligence items matched the current data.`
              }
            />
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item: IntelligenceItem) => (
                <IntelligenceCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      ) : null}
      </NexusSectionFrame>
    </div>
  );
}
