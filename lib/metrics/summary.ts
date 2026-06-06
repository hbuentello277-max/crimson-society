import type { SupabaseClient } from "@supabase/supabase-js";
import {
  METRIC_KEYS,
  type ActivityMetrics,
  type BlackcardMetrics,
  type GrowthMetrics,
  type NexusMetricsSummary,
  type RevenueMetrics,
} from "@/lib/metrics/types";

type SnapshotRow = {
  metric_key: string;
  value: number;
  previous_value: number | null;
  period_start: string;
  metadata: Record<string, unknown>;
};

function latestValue(map: Map<string, SnapshotRow>, key: string): number | null {
  const row = map.get(key);
  if (!row) {
    return null;
  }

  return Number.isFinite(Number(row.value)) ? Number(row.value) : null;
}

function buildRevenueMetrics(map: Map<string, SnapshotRow>): RevenueMetrics {
  return {
    active_subscriptions: latestValue(map, METRIC_KEYS.REVENUE_ACTIVE_SUBSCRIPTIONS),
    blackcard_monthly_count: latestValue(map, METRIC_KEYS.REVENUE_BLACKCARD_MONTHLY),
    blackcard_yearly_count: latestValue(map, METRIC_KEYS.REVENUE_BLACKCARD_YEARLY),
    estimated_mrr: latestValue(map, METRIC_KEYS.REVENUE_MRR),
    estimated_arr: latestValue(map, METRIC_KEYS.REVENUE_ARR),
    recent_subscription_changes_24h: latestValue(map, METRIC_KEYS.REVENUE_SUBSCRIPTION_CHANGES_24H),
    stripe_webhook: {
      processed_1h: latestValue(map, METRIC_KEYS.REVENUE_STRIPE_WEBHOOK_PROCESSED_1H),
      failed_1h: latestValue(map, METRIC_KEYS.REVENUE_STRIPE_WEBHOOK_FAILED_1H),
      processing_1h: null,
      available:
        latestValue(map, METRIC_KEYS.REVENUE_STRIPE_WEBHOOK_PROCESSED_1H) !== null ||
        latestValue(map, METRIC_KEYS.REVENUE_STRIPE_WEBHOOK_FAILED_1H) !== null,
      error: null,
    },
    warnings: [],
  };
}

function buildGrowthMetrics(map: Map<string, SnapshotRow>): GrowthMetrics {
  return {
    total_users: latestValue(map, METRIC_KEYS.GROWTH_TOTAL_USERS),
    new_users_today: latestValue(map, METRIC_KEYS.GROWTH_SIGNUPS_DAILY),
    new_users_this_week: latestValue(map, METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY),
    new_users_this_month: latestValue(map, METRIC_KEYS.GROWTH_SIGNUPS_MONTHLY),
    active_profiles: latestValue(map, METRIC_KEYS.GROWTH_ACTIVE_PROFILES),
    restricted_profiles: latestValue(map, METRIC_KEYS.GROWTH_RESTRICTED_PROFILES),
    deleted_profiles: latestValue(map, METRIC_KEYS.GROWTH_DELETED_PROFILES),
    deletion_pending_profiles: latestValue(map, METRIC_KEYS.GROWTH_DELETION_PENDING),
    pending_deletion_requests: latestValue(map, METRIC_KEYS.GROWTH_PENDING_DELETION_REQUESTS),
    warnings: [],
  };
}

function buildBlackcardMetrics(map: Map<string, SnapshotRow>): BlackcardMetrics {
  const conversionRow = map.get(METRIC_KEYS.BLACKCARD_CONVERSION_ESTIMATE);

  return {
    active_members: latestValue(map, METRIC_KEYS.BLACKCARD_ACTIVE),
    trialing_members: latestValue(map, METRIC_KEYS.BLACKCARD_TRIALING),
    expired_canceled_members: latestValue(map, METRIC_KEYS.BLACKCARD_EXPIRED_CANCELED),
    monthly_plan_count: latestValue(map, METRIC_KEYS.BLACKCARD_MONTHLY),
    yearly_plan_count: latestValue(map, METRIC_KEYS.BLACKCARD_YEARLY),
    conversion_estimate: latestValue(map, METRIC_KEYS.BLACKCARD_CONVERSION_ESTIMATE),
    conversion_estimate_available: conversionRow?.metadata?.available === true,
    warnings: [],
  };
}

function buildActivityMetrics(map: Map<string, SnapshotRow>): ActivityMetrics {
  return {
    posts_today: latestValue(map, METRIC_KEYS.ACTIVITY_POSTS_DAILY),
    posts_this_week: latestValue(map, METRIC_KEYS.ACTIVITY_POSTS_WEEKLY),
    meets_today: latestValue(map, METRIC_KEYS.ACTIVITY_MEETS_DAILY),
    meets_this_week: latestValue(map, METRIC_KEYS.ACTIVITY_MEETS_WEEKLY),
    messages_today: latestValue(map, METRIC_KEYS.ACTIVITY_MESSAGES_DAILY),
    messages_this_week: latestValue(map, METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY),
    push_pending: latestValue(map, METRIC_KEYS.ACTIVITY_PUSH_PENDING),
    push_sent_today: latestValue(map, METRIC_KEYS.ACTIVITY_PUSH_SENT_DAILY),
    push_failed_today: latestValue(map, METRIC_KEYS.ACTIVITY_PUSH_FAILED_DAILY),
    media_uploads_today: latestValue(map, METRIC_KEYS.ACTIVITY_MEDIA_DAILY),
    media_uploads_this_week: latestValue(map, METRIC_KEYS.ACTIVITY_MEDIA_WEEKLY),
    warnings: [],
  };
}

export async function getNexusMetricsSummary(
  supabase: SupabaseClient,
): Promise<NexusMetricsSummary> {
  const metricKeys = Object.values(METRIC_KEYS);
  const { data, error } = await supabase
    .from("nexus_metrics_snapshots")
    .select("metric_key, value, previous_value, period_start, metadata")
    .in("metric_key", metricKeys)
    .order("period_start", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const latestByKey = new Map<string, SnapshotRow>();
  for (const row of (data ?? []) as SnapshotRow[]) {
    if (!latestByKey.has(row.metric_key)) {
      latestByKey.set(row.metric_key, row);
    }
  }

  const collectedAt = Array.from(latestByKey.values()).reduce<string | null>((latest, row) => {
    const collected =
      typeof row.metadata?.collected_at === "string" ? row.metadata.collected_at : row.period_start;

    if (!latest || collected > latest) {
      return collected;
    }

    return latest;
  }, null);

  return {
    collected_at: collectedAt,
    revenue: buildRevenueMetrics(latestByKey),
    growth: buildGrowthMetrics(latestByKey),
    blackcard: buildBlackcardMetrics(latestByKey),
    activity: buildActivityMetrics(latestByKey),
    snapshot_count: latestByKey.size,
  };
}
