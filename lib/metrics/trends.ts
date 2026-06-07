import type { SupabaseClient } from "@supabase/supabase-js";
import { METRIC_KEYS, type MetricKey } from "@/lib/metrics/types";
import { cacheKey, runCached } from "@/lib/nexus/request-cache";

export type MetricSnapshotTrend = {
  current: number;
  previous: number | null;
};

export type MetricTrendDirection = "up" | "down" | "flat" | "unknown";

export const CORE_TREND_METRIC_KEYS: MetricKey[] = [
  METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
  METRIC_KEYS.GROWTH_SIGNUPS_MONTHLY,
  METRIC_KEYS.GROWTH_ACTIVE_PROFILES,
  METRIC_KEYS.BLACKCARD_ACTIVE,
  METRIC_KEYS.REVENUE_MRR,
  METRIC_KEYS.REVENUE_ARR,
  METRIC_KEYS.REVENUE_ACTIVE_SUBSCRIPTIONS,
  METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
];

export const MISSION_CONTROL_TREND_KEYS: MetricKey[] = [
  METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
  METRIC_KEYS.GROWTH_ACTIVE_PROFILES,
  METRIC_KEYS.REVENUE_MRR,
  METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
];

export const OPERATIONAL_INTELLIGENCE_TREND_KEYS: MetricKey[] = [
  METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
  METRIC_KEYS.GROWTH_ACTIVE_PROFILES,
  METRIC_KEYS.BLACKCARD_ACTIVE,
  METRIC_KEYS.REVENUE_MRR,
  METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
];

export const PLANNING_TREND_KEYS: MetricKey[] = [
  METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
  METRIC_KEYS.GROWTH_SIGNUPS_MONTHLY,
  METRIC_KEYS.BLACKCARD_ACTIVE,
  METRIC_KEYS.REVENUE_MRR,
  METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
];

export function metricTrendDirection(
  trend: MetricSnapshotTrend | null | undefined,
): MetricTrendDirection {
  if (!trend || trend.previous == null) return "unknown";
  if (trend.current > trend.previous) return "up";
  if (trend.current < trend.previous) return "down";
  return "flat";
}

export function trendDirectionScore(direction: MetricTrendDirection): number {
  if (direction === "up") return 85;
  if (direction === "flat") return 60;
  if (direction === "down") return 35;
  return 50;
}

async function loadMetricSnapshotTrendsImpl(
  supabase: SupabaseClient,
  keys: readonly MetricKey[],
): Promise<Record<string, MetricSnapshotTrend>> {
  const { data, error } = await supabase
    .from("nexus_metrics_snapshots")
    .select("metric_key, value, previous_value, period_start")
    .in("metric_key", [...keys])
    .order("period_start", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const trends: Record<string, MetricSnapshotTrend> = {};

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

export function loadMetricSnapshotTrends(
  supabase: SupabaseClient,
  keys: readonly MetricKey[] = CORE_TREND_METRIC_KEYS,
): Promise<Record<string, MetricSnapshotTrend>> {
  return runCached(
    supabase,
    cacheKey("nexus:metric-snapshot-trends", { keys: [...keys].sort() }),
    () => loadMetricSnapshotTrendsImpl(supabase, keys),
  );
}

export function pickTrendSubset(
  trends: Record<string, MetricSnapshotTrend>,
  keys: readonly MetricKey[],
): Record<string, MetricSnapshotTrend> {
  const subset: Record<string, MetricSnapshotTrend> = {};
  for (const key of keys) {
    if (trends[key]) {
      subset[key] = trends[key];
    }
  }
  return subset;
}
