import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CORE_TREND_METRIC_KEYS,
  loadMetricSnapshotTrends,
} from "@/lib/metrics/trends";
import { cacheKey, runCached } from "@/lib/nexus/request-cache";
import { loadReportContext } from "@/lib/reports/context";
import { INTELLIGENCE_RULES } from "@/lib/intelligence/rules";
import type {
  IntelligenceContext,
  IntelligenceItem,
  IntelligenceSort,
  IntelligenceSummary,
  MetricTrend,
} from "@/lib/intelligence/types";
import { INTELLIGENCE_CATEGORIES } from "@/lib/intelligence/types";

export async function loadIntelligenceContext(
  supabase: SupabaseClient,
): Promise<IntelligenceContext> {
  const [reportContext, trends] = await Promise.all([
    loadReportContext(supabase),
    loadMetricSnapshotTrends(supabase, CORE_TREND_METRIC_KEYS) as Promise<
      Record<string, MetricTrend>
    >,
  ]);

  return {
    ...reportContext,
    generated_at: reportContext.collected_at,
    trends,
  };
}

export function generateIntelligenceItems(context: IntelligenceContext): IntelligenceItem[] {
  const items: IntelligenceItem[] = [];
  const seen = new Set<string>();

  for (const rule of INTELLIGENCE_RULES) {
    const result = rule(context);
    if (!result || seen.has(result.id)) continue;
    seen.add(result.id);
    items.push(result);
  }

  return items;
}

export function sortIntelligenceItems(
  items: IntelligenceItem[],
  sort: IntelligenceSort,
): IntelligenceItem[] {
  const copy = [...items];

  copy.sort((a, b) => {
    if (sort === "confidence") {
      return b.confidence_score - a.confidence_score || b.impact_score - a.impact_score;
    }

    return b.impact_score - a.impact_score || b.confidence_score - a.confidence_score;
  });

  return copy;
}

export function countIntelligenceByCategory(
  items: IntelligenceItem[],
): IntelligenceSummary["counts"] {
  const counts = Object.fromEntries(
    INTELLIGENCE_CATEGORIES.map((category) => [category, 0]),
  ) as IntelligenceSummary["counts"];

  for (const item of items) {
    counts[item.category] += 1;
  }

  return counts;
}

export function getNexusIntelligence(
  supabase: SupabaseClient,
  options?: { sort?: IntelligenceSort },
): Promise<IntelligenceSummary> {
  const sort = options?.sort ?? "impact";
  return runCached(supabase, cacheKey("nexus:intelligence", { sort }), () =>
    getNexusIntelligenceImpl(supabase, sort),
  );
}

async function getNexusIntelligenceImpl(
  supabase: SupabaseClient,
  sort: IntelligenceSort,
): Promise<IntelligenceSummary> {
  const context = await loadIntelligenceContext(supabase);
  const items = sortIntelligenceItems(generateIntelligenceItems(context), sort);

  return {
    collected_at: context.generated_at,
    items,
    counts: countIntelligenceByCategory(items),
  };
}
