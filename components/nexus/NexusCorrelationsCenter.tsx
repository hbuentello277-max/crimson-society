"use client";

import { useMemo, useState } from "react";
import type { CorrelationCategory, CorrelationItem } from "@/lib/correlations/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { CorrelationCard } from "@/components/nexus/correlations/CorrelationCard";
import { CorrelationFilters } from "@/components/nexus/correlations/CorrelationFilters";
import { NexusListEmpty, NexusSectionFrame } from "@/components/nexus/NexusShared";

type CorrelationsPayload = {
  ok?: boolean;
  generated_at?: string;
  window?: "24h" | "7d" | "30d";
  counts_by_category?: Partial<Record<CorrelationCategory, number>>;
  correlations?: CorrelationItem[];
};

export function NexusCorrelationsCenter() {
  const [category, setCategory] = useState<CorrelationCategory | "all">("all");
  const [sort, setSort] = useState<"impact" | "confidence">("impact");
  const [window, setWindow] = useState<"24h" | "7d" | "30d">("7d");

  const path = `/api/nexus/correlations?sort=${sort}&window=${window}${
    category === "all" ? "" : `&category=${category}`
  }`;

  const { data, error, loading, refresh } = useNexusFetch<CorrelationsPayload>(path);

  const correlations = useMemo(() => data?.correlations ?? [], [data?.correlations]);

  return (
    <NexusSectionFrame
      title="Correlations"
      description="Deterministic signal relationships across Nexus telemetry, memory, and operations. Mark I — read-only, no AI or execution."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm text-zinc-300">
            Nexus connects deployments, growth, engagement, revenue, workflows, alerts, incidents,
            commands, and memory events over time. Correlations appear only when existing data
            supports the relationship.
          </div>

          <CorrelationFilters
            category={category}
            sort={sort}
            window={window}
            counts={data?.counts_by_category ?? {}}
            onCategoryChange={setCategory}
            onSortChange={setSort}
            onWindowChange={setWindow}
          />

          {correlations.length === 0 ? (
            <NexusListEmpty
              title="No correlations detected"
              description="Not enough supported signal overlap was found for the selected window. Try a wider window or run Sync to refresh operational data."
            />
          ) : (
            <div className="space-y-3">
              {correlations.map((item) => (
                <CorrelationCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}
