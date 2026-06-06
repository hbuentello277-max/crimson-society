import type { SupabaseClient } from "@supabase/supabase-js";
import { METRIC_KEYS, type MetricKey } from "@/lib/metrics/types";
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

const TREND_METRIC_KEYS: MetricKey[] = [
  METRIC_KEYS.GROWTH_SIGNUPS_MONTHLY,
  METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
  METRIC_KEYS.GROWTH_ACTIVE_PROFILES,
  METRIC_KEYS.BLACKCARD_ACTIVE,
  METRIC_KEYS.REVENUE_MRR,
  METRIC_KEYS.REVENUE_ARR,
  METRIC_KEYS.REVENUE_ACTIVE_SUBSCRIPTIONS,
  METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
];

async function loadMetricTrends(supabase: SupabaseClient): Promise<Record<string, MetricTrend>> {
  const { data, error } = await supabase
    .from("nexus_metrics_snapshots")
    .select("metric_key, value, previous_value, period_start")
    .in("metric_key", TREND_METRIC_KEYS)
    .order("period_start", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const trends: Record<string, MetricTrend> = {};

  for (const row of data ?? []) {
    const key = row.metric_key as string;
    if (trends[key]) continue;

    const current = Number(row.value);
    const previousRaw = row.previous_value;
    const previous =
      previousRaw == null || !Number.isFinite(Number(previousRaw)) ? null : Number(previousRaw);

    if (!Number.isFinite(current)) continue;

    trends[key] = { current, previous };
  }

  return trends;
}

export async function loadIntelligenceContext(
  supabase: SupabaseClient,
): Promise<IntelligenceContext> {
  const [reportContext, trends] = await Promise.all([
    loadReportContext(supabase),
    loadMetricTrends(supabase),
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

export async function getNexusIntelligence(
  supabase: SupabaseClient,
  options?: { sort?: IntelligenceSort },
): Promise<IntelligenceSummary> {
  const context = await loadIntelligenceContext(supabase);
  const items = sortIntelligenceItems(
    generateIntelligenceItems(context),
    options?.sort ?? "impact",
  );

  return {
    collected_at: context.generated_at,
    items,
    counts: countIntelligenceByCategory(items),
  };
}
