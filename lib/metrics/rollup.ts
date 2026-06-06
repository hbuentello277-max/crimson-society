import { createNexusServiceClient } from "@/lib/nexus/client";
import { emitNexusEvent } from "@/lib/events/emit";
import { collectAllMetrics } from "@/lib/metrics/collect";
import { floorToFiveMinuteBucket } from "@/lib/metrics/query-utils";
import {
  METRIC_KEYS,
  type MetricSnapshotInput,
  type NexusMetricsBundle,
  type NexusMetricsRollupResult,
} from "@/lib/metrics/types";

function metricValue(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function bundleToSnapshots(
  bundle: NexusMetricsBundle,
  periodStart: string,
): MetricSnapshotInput[] {
  const { revenue, growth, blackcard, activity } = bundle;
  const period = "5min" as const;
  const collectedAt = bundle.collected_at;

  const entries: Array<{ key: string; value: number | null; metadata?: Record<string, unknown> }> = [
    { key: METRIC_KEYS.REVENUE_ACTIVE_SUBSCRIPTIONS, value: metricValue(revenue.active_subscriptions) },
    { key: METRIC_KEYS.REVENUE_BLACKCARD_MONTHLY, value: metricValue(revenue.blackcard_monthly_count) },
    { key: METRIC_KEYS.REVENUE_BLACKCARD_YEARLY, value: metricValue(revenue.blackcard_yearly_count) },
    { key: METRIC_KEYS.REVENUE_MRR, value: metricValue(revenue.estimated_mrr) },
    { key: METRIC_KEYS.REVENUE_ARR, value: metricValue(revenue.estimated_arr) },
    {
      key: METRIC_KEYS.REVENUE_SUBSCRIPTION_CHANGES_24H,
      value: metricValue(revenue.recent_subscription_changes_24h),
    },
    {
      key: METRIC_KEYS.REVENUE_STRIPE_WEBHOOK_FAILED_1H,
      value: metricValue(revenue.stripe_webhook.failed_1h),
    },
    {
      key: METRIC_KEYS.REVENUE_STRIPE_WEBHOOK_PROCESSED_1H,
      value: metricValue(revenue.stripe_webhook.processed_1h),
    },
    { key: METRIC_KEYS.GROWTH_TOTAL_USERS, value: metricValue(growth.total_users) },
    { key: METRIC_KEYS.GROWTH_SIGNUPS_DAILY, value: metricValue(growth.new_users_today) },
    { key: METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY, value: metricValue(growth.new_users_this_week) },
    { key: METRIC_KEYS.GROWTH_SIGNUPS_MONTHLY, value: metricValue(growth.new_users_this_month) },
    { key: METRIC_KEYS.GROWTH_ACTIVE_PROFILES, value: metricValue(growth.active_profiles) },
    { key: METRIC_KEYS.GROWTH_RESTRICTED_PROFILES, value: metricValue(growth.restricted_profiles) },
    { key: METRIC_KEYS.GROWTH_DELETED_PROFILES, value: metricValue(growth.deleted_profiles) },
    { key: METRIC_KEYS.GROWTH_DELETION_PENDING, value: metricValue(growth.deletion_pending_profiles) },
    {
      key: METRIC_KEYS.GROWTH_PENDING_DELETION_REQUESTS,
      value: metricValue(growth.pending_deletion_requests),
    },
    { key: METRIC_KEYS.BLACKCARD_ACTIVE, value: metricValue(blackcard.active_members) },
    { key: METRIC_KEYS.BLACKCARD_TRIALING, value: metricValue(blackcard.trialing_members) },
    {
      key: METRIC_KEYS.BLACKCARD_EXPIRED_CANCELED,
      value: metricValue(blackcard.expired_canceled_members),
    },
    { key: METRIC_KEYS.BLACKCARD_MONTHLY, value: metricValue(blackcard.monthly_plan_count) },
    { key: METRIC_KEYS.BLACKCARD_YEARLY, value: metricValue(blackcard.yearly_plan_count) },
    {
      key: METRIC_KEYS.BLACKCARD_CONVERSION_ESTIMATE,
      value: metricValue(blackcard.conversion_estimate),
      metadata: { available: blackcard.conversion_estimate_available },
    },
    { key: METRIC_KEYS.ACTIVITY_POSTS_DAILY, value: metricValue(activity.posts_today) },
    { key: METRIC_KEYS.ACTIVITY_POSTS_WEEKLY, value: metricValue(activity.posts_this_week) },
    { key: METRIC_KEYS.ACTIVITY_MEETS_DAILY, value: metricValue(activity.meets_today) },
    { key: METRIC_KEYS.ACTIVITY_MEETS_WEEKLY, value: metricValue(activity.meets_this_week) },
    { key: METRIC_KEYS.ACTIVITY_MESSAGES_DAILY, value: metricValue(activity.messages_today) },
    { key: METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY, value: metricValue(activity.messages_this_week) },
    { key: METRIC_KEYS.ACTIVITY_PUSH_PENDING, value: metricValue(activity.push_pending) },
    { key: METRIC_KEYS.ACTIVITY_PUSH_SENT_DAILY, value: metricValue(activity.push_sent_today) },
    { key: METRIC_KEYS.ACTIVITY_PUSH_FAILED_DAILY, value: metricValue(activity.push_failed_today) },
    { key: METRIC_KEYS.ACTIVITY_MEDIA_DAILY, value: metricValue(activity.media_uploads_today) },
    { key: METRIC_KEYS.ACTIVITY_MEDIA_WEEKLY, value: metricValue(activity.media_uploads_this_week) },
  ];

  return entries
    .filter((entry) => entry.value !== null)
    .map((entry) => ({
      metric_key: entry.key,
      period,
      period_start: periodStart,
      value: entry.value as number,
      dimensions: {},
      metadata: {
        collected_at: collectedAt,
        ...(entry.metadata ?? {}),
      },
    }));
}

async function loadPreviousValue(
  admin: ReturnType<typeof createNexusServiceClient>,
  metricKey: string,
  period: string,
  periodStart: string,
): Promise<number | null> {
  const { data, error } = await admin
    .from("nexus_metrics_snapshots")
    .select("value")
    .eq("metric_key", metricKey)
    .eq("period", period)
    .lt("period_start", periodStart)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return Number(data.value);
}

export async function runNexusMetricsRollup(): Promise<NexusMetricsRollupResult> {
  const collectedAt = new Date().toISOString();
  const periodStart = floorToFiveMinuteBucket(new Date(collectedAt));
  const admin = createNexusServiceClient();

  try {
    const metrics = await collectAllMetrics(admin);
    const snapshots = bundleToSnapshots(metrics, periodStart);

    let snapshotsRecorded = 0;
    let eventsEmitted = 0;

    for (const snapshot of snapshots) {
      const previousValue = await loadPreviousValue(
        admin,
        snapshot.metric_key,
        snapshot.period,
        snapshot.period_start,
      );

      const { error } = await admin.from("nexus_metrics_snapshots").upsert(
        {
          metric_key: snapshot.metric_key,
          period: snapshot.period,
          period_start: snapshot.period_start,
          value: snapshot.value,
          previous_value: previousValue,
          dimensions: snapshot.dimensions ?? {},
          metadata: snapshot.metadata ?? {},
        },
        { onConflict: "metric_key,period,period_start,dimensions" },
      );

      if (!error) {
        snapshotsRecorded += 1;
      } else {
        console.warn("[nexus-metrics] failed to record snapshot", snapshot.metric_key, error.message);
      }
    }

    const rollupEvent = await emitNexusEvent({
      source: "collector",
      category: "commerce",
      eventType: "metrics.rollup.completed",
      severity: "info",
      title: "Nexus metrics rollup completed",
      description: `Recorded ${snapshotsRecorded} metric snapshots`,
      payload: {
        snapshots_recorded: snapshotsRecorded,
        period_start: periodStart,
        revenue_mrr: metrics.revenue.estimated_mrr,
        growth_total_users: metrics.growth.total_users,
        blackcard_active_members: metrics.blackcard.active_members,
        activity_posts_today: metrics.activity.posts_today,
      },
      occurredAt: collectedAt,
      metadata: {
        warnings: [
          ...metrics.revenue.warnings,
          ...metrics.growth.warnings,
          ...metrics.blackcard.warnings,
          ...metrics.activity.warnings,
        ],
      },
    });

    if (rollupEvent.ok) {
      eventsEmitted += 1;
    }

    const mrrEvent = await emitNexusEvent({
      source: "collector",
      category: "revenue",
      eventType: "metrics.revenue.snapshot",
      severity: "info",
      title: "Revenue metrics snapshot",
      description:
        metrics.revenue.estimated_mrr !== null
          ? `Estimated MRR: ${metrics.revenue.estimated_mrr}`
          : "Revenue metrics partially unavailable",
      payload: {
        active_subscriptions: metrics.revenue.active_subscriptions,
        estimated_mrr: metrics.revenue.estimated_mrr,
        estimated_arr: metrics.revenue.estimated_arr,
        blackcard_monthly_count: metrics.revenue.blackcard_monthly_count,
        blackcard_yearly_count: metrics.revenue.blackcard_yearly_count,
      },
      occurredAt: collectedAt,
    });

    if (mrrEvent.ok) {
      eventsEmitted += 1;
    }

    return {
      ok: true,
      collectedAt,
      periodStart,
      snapshotsRecorded,
      eventsEmitted,
      metrics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "metrics rollup failed";
    console.error("[nexus-metrics] rollup error", message);

    return {
      ok: false,
      collectedAt,
      periodStart,
      snapshotsRecorded: 0,
      eventsEmitted: 0,
      metrics: null,
      error: message,
    };
  }
}
