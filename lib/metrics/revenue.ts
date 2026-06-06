import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addWarning,
  countTableRows,
  daysAgoIso,
  estimateMrr,
  hoursAgoIso,
  loadMembershipPlanPrices,
} from "@/lib/metrics/query-utils";
import type { RevenueMetrics } from "@/lib/metrics/types";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

type SubscriptionRow = {
  plan_type: string | null;
  status: string | null;
};

function isActiveSubscription(row: SubscriptionRow): boolean {
  return Boolean(
    row.status &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(row.status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number]),
  );
}

export async function collectRevenueMetrics(admin: SupabaseClient): Promise<RevenueMetrics> {
  const warnings: RevenueMetrics["warnings"] = [];
  const prices = await loadMembershipPlanPrices(admin, warnings);
  const nowIso = new Date().toISOString();

  const { data: subscriptionRows, error: subscriptionsError } = await admin
    .from("subscriptions")
    .select("plan_type, status, current_period_end, updated_at")
    .in("status", [...ACTIVE_SUBSCRIPTION_STATUSES, "canceled", "cancelled", "past_due", "unpaid", "incomplete_expired"]);

  if (subscriptionsError) {
    addWarning(warnings, "subscriptions", subscriptionsError.message);
  }

  const rows = (subscriptionRows ?? []) as Array<{
    plan_type: string | null;
    status: string | null;
    current_period_end: string | null;
    updated_at: string | null;
  }>;

  const activeRows = rows.filter((row) => {
    if (!isActiveSubscription(row)) {
      return false;
    }

    if (row.current_period_end && row.current_period_end < nowIso) {
      return false;
    }

    return true;
  });

  const monthlyCount = activeRows.filter((row) => row.plan_type === "monthly").length;
  const yearlyCount = activeRows.filter((row) => row.plan_type === "yearly").length;
  const activeSubscriptions = activeRows.length;
  const estimatedMrr = estimateMrr({
    monthlyCount,
    yearlyCount,
    prices,
  });
  const estimatedArr = Math.round(estimatedMrr * 12 * 100) / 100;

  const changesSince = daysAgoIso(1);
  const recentChanges = rows.filter((row) => row.updated_at && row.updated_at >= changesSince).length;

  const webhookSince = hoursAgoIso(1);
  const [processed, failed, processing] = await Promise.all([
    countTableRows(admin, "stripe_webhook_events", {
      timestampColumn: "received_at",
      sinceIso: webhookSince,
      filters: [{ column: "status", op: "eq", value: "processed" }],
    }),
    countTableRows(admin, "stripe_webhook_events", {
      timestampColumn: "received_at",
      sinceIso: webhookSince,
      filters: [{ column: "status", op: "eq", value: "failed" }],
    }),
    countTableRows(admin, "stripe_webhook_events", {
      timestampColumn: "received_at",
      sinceIso: webhookSince,
      filters: [{ column: "status", op: "eq", value: "processing" }],
    }),
  ]);

  const webhookError = processed.error ?? failed.error ?? processing.error;
  if (webhookError) {
    addWarning(warnings, "stripe_webhook_events", webhookError);
  }

  return {
    active_subscriptions: subscriptionsError ? null : activeSubscriptions,
    blackcard_monthly_count: subscriptionsError ? null : monthlyCount,
    blackcard_yearly_count: subscriptionsError ? null : yearlyCount,
    estimated_mrr: subscriptionsError ? null : estimatedMrr,
    estimated_arr: subscriptionsError ? null : estimatedArr,
    recent_subscription_changes_24h: subscriptionsError ? null : recentChanges,
    stripe_webhook: {
      processed_1h: processed.error ? null : processed.count,
      failed_1h: failed.error ? null : failed.count,
      processing_1h: processing.error ? null : processing.count,
      available: !webhookError,
      error: webhookError,
    },
    warnings,
  };
}
