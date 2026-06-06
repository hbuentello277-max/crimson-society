import type { SupabaseClient } from "@supabase/supabase-js";
import { addWarning, daysAgoIso } from "@/lib/metrics/query-utils";
import type { BlackcardMetrics } from "@/lib/metrics/types";

const ACTIVE_STATUSES = ["active", "trialing"] as const;
const INACTIVE_STATUSES = [
  "canceled",
  "cancelled",
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

const CONVERSION_MIN_NEW_USERS = 10;

type SubscriptionRow = {
  status: string | null;
  plan_type: string | null;
  current_period_end: string | null;
};

function isCurrentlyActive(row: SubscriptionRow, nowIso: string): boolean {
  if (!row.status || !ACTIVE_STATUSES.includes(row.status as (typeof ACTIVE_STATUSES)[number])) {
    return false;
  }

  if (row.current_period_end && row.current_period_end < nowIso) {
    return false;
  }

  return true;
}

export async function collectBlackcardMetrics(
  admin: SupabaseClient,
  growthNewUsersMonth: number | null,
): Promise<BlackcardMetrics> {
  const warnings: BlackcardMetrics["warnings"] = [];
  const nowIso = new Date().toISOString();
  const monthStart = daysAgoIso(30);

  const { data, error } = await admin
    .from("subscriptions")
    .select("status, plan_type, current_period_end, created_at");

  if (error) {
    addWarning(warnings, "subscriptions", error.message);
    return {
      active_members: null,
      trialing_members: null,
      expired_canceled_members: null,
      monthly_plan_count: null,
      yearly_plan_count: null,
      conversion_estimate: null,
      conversion_estimate_available: false,
      warnings,
    };
  }

  const rows = (data ?? []) as Array<SubscriptionRow & { created_at: string | null }>;
  const activeRows = rows.filter((row) => isCurrentlyActive(row, nowIso));

  const activeMembers = activeRows.filter((row) => row.status === "active").length;
  const trialingMembers = activeRows.filter((row) => row.status === "trialing").length;
  const monthlyPlanCount = activeRows.filter((row) => row.plan_type === "monthly").length;
  const yearlyPlanCount = activeRows.filter((row) => row.plan_type === "yearly").length;

  const expiredCanceledMembers = rows.filter((row) => {
    if (row.status && INACTIVE_STATUSES.includes(row.status as (typeof INACTIVE_STATUSES)[number])) {
      return true;
    }

    return Boolean(row.current_period_end && row.current_period_end < nowIso);
  }).length;

  const newSubscriptionsMonth = rows.filter(
    (row) => row.created_at && row.created_at >= monthStart && isCurrentlyActive(row, nowIso),
  ).length;

  let conversionEstimate: number | null = null;
  let conversionEstimateAvailable = false;

  if (
    growthNewUsersMonth !== null &&
    growthNewUsersMonth >= CONVERSION_MIN_NEW_USERS &&
    newSubscriptionsMonth > 0
  ) {
    conversionEstimateAvailable = true;
    conversionEstimate =
      Math.round((newSubscriptionsMonth / growthNewUsersMonth) * 10_000) / 100;
  }

  return {
    active_members: activeMembers,
    trialing_members: trialingMembers,
    expired_canceled_members: expiredCanceledMembers,
    monthly_plan_count: monthlyPlanCount,
    yearly_plan_count: yearlyPlanCount,
    conversion_estimate: conversionEstimate,
    conversion_estimate_available: conversionEstimateAvailable,
    warnings,
  };
}
