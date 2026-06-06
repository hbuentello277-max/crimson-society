export type MetricPeriod = "5min" | "hourly" | "daily" | "weekly" | "monthly";

export type MetricSnapshotInput = {
  metric_key: string;
  period: MetricPeriod;
  period_start: string;
  value: number;
  previous_value?: number | null;
  dimensions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type MetricCollectionWarning = {
  field: string;
  message: string;
};

export type StripeWebhookHealthSummary = {
  processed_1h: number | null;
  failed_1h: number | null;
  processing_1h: number | null;
  available: boolean;
  error?: string | null;
};

export type RevenueMetrics = {
  active_subscriptions: number | null;
  blackcard_monthly_count: number | null;
  blackcard_yearly_count: number | null;
  estimated_mrr: number | null;
  estimated_arr: number | null;
  recent_subscription_changes_24h: number | null;
  stripe_webhook: StripeWebhookHealthSummary;
  warnings: MetricCollectionWarning[];
};

export type GrowthMetrics = {
  total_users: number | null;
  new_users_today: number | null;
  new_users_this_week: number | null;
  new_users_this_month: number | null;
  active_profiles: number | null;
  restricted_profiles: number | null;
  deleted_profiles: number | null;
  deletion_pending_profiles: number | null;
  pending_deletion_requests: number | null;
  warnings: MetricCollectionWarning[];
};

export type BlackcardMetrics = {
  active_members: number | null;
  trialing_members: number | null;
  expired_canceled_members: number | null;
  monthly_plan_count: number | null;
  yearly_plan_count: number | null;
  conversion_estimate: number | null;
  conversion_estimate_available: boolean;
  warnings: MetricCollectionWarning[];
};

export type ActivityMetrics = {
  posts_today: number | null;
  posts_this_week: number | null;
  meets_today: number | null;
  meets_this_week: number | null;
  messages_today: number | null;
  messages_this_week: number | null;
  push_pending: number | null;
  push_sent_today: number | null;
  push_failed_today: number | null;
  media_uploads_today: number | null;
  media_uploads_this_week: number | null;
  warnings: MetricCollectionWarning[];
};

export type NexusMetricsBundle = {
  collected_at: string;
  revenue: RevenueMetrics;
  growth: GrowthMetrics;
  blackcard: BlackcardMetrics;
  activity: ActivityMetrics;
};

export type NexusMetricsSummary = {
  collected_at: string | null;
  revenue: RevenueMetrics;
  growth: GrowthMetrics;
  blackcard: BlackcardMetrics;
  activity: ActivityMetrics;
  snapshot_count: number;
};

export type NexusMetricsRollupResult = {
  ok: boolean;
  collectedAt: string;
  periodStart: string;
  snapshotsRecorded: number;
  eventsEmitted: number;
  metrics: NexusMetricsBundle | null;
  error?: string;
};

export const METRIC_KEYS = {
  REVENUE_ACTIVE_SUBSCRIPTIONS: "revenue.active_subscriptions",
  REVENUE_BLACKCARD_MONTHLY: "revenue.blackcard_monthly",
  REVENUE_BLACKCARD_YEARLY: "revenue.blackcard_yearly",
  REVENUE_MRR: "revenue.mrr",
  REVENUE_ARR: "revenue.arr",
  REVENUE_SUBSCRIPTION_CHANGES_24H: "revenue.subscription_changes_24h",
  REVENUE_STRIPE_WEBHOOK_FAILED_1H: "revenue.stripe_webhook_failed_1h",
  REVENUE_STRIPE_WEBHOOK_PROCESSED_1H: "revenue.stripe_webhook_processed_1h",
  GROWTH_TOTAL_USERS: "growth.total_users",
  GROWTH_SIGNUPS_DAILY: "growth.signups_daily",
  GROWTH_SIGNUPS_WEEKLY: "growth.signups_weekly",
  GROWTH_SIGNUPS_MONTHLY: "growth.signups_monthly",
  GROWTH_ACTIVE_PROFILES: "growth.active_profiles",
  GROWTH_RESTRICTED_PROFILES: "growth.restricted_profiles",
  GROWTH_DELETED_PROFILES: "growth.deleted_profiles",
  GROWTH_DELETION_PENDING: "growth.deletion_pending_profiles",
  GROWTH_PENDING_DELETION_REQUESTS: "growth.pending_deletion_requests",
  BLACKCARD_ACTIVE: "blackcard.active_members",
  BLACKCARD_TRIALING: "blackcard.trialing_members",
  BLACKCARD_EXPIRED_CANCELED: "blackcard.expired_canceled_members",
  BLACKCARD_MONTHLY: "blackcard.monthly_plan_count",
  BLACKCARD_YEARLY: "blackcard.yearly_plan_count",
  BLACKCARD_CONVERSION_ESTIMATE: "blackcard.conversion_estimate",
  ACTIVITY_POSTS_DAILY: "activity.posts_daily",
  ACTIVITY_POSTS_WEEKLY: "activity.posts_weekly",
  ACTIVITY_MEETS_DAILY: "activity.meets_daily",
  ACTIVITY_MEETS_WEEKLY: "activity.meets_weekly",
  ACTIVITY_MESSAGES_DAILY: "activity.messages_daily",
  ACTIVITY_MESSAGES_WEEKLY: "activity.messages_weekly",
  ACTIVITY_PUSH_PENDING: "activity.push_pending",
  ACTIVITY_PUSH_SENT_DAILY: "activity.push_sent_daily",
  ACTIVITY_PUSH_FAILED_DAILY: "activity.push_failed_daily",
  ACTIVITY_MEDIA_DAILY: "activity.media_uploads_daily",
  ACTIVITY_MEDIA_WEEKLY: "activity.media_uploads_weekly",
} as const;

export type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS];
