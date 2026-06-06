import type { SupabaseClient } from "@supabase/supabase-js";
import { collectActivityMetrics } from "@/lib/metrics/activity";
import { collectBlackcardMetrics } from "@/lib/metrics/blackcard";
import { collectGrowthMetrics } from "@/lib/metrics/growth";
import { nowIso } from "@/lib/metrics/query-utils";
import { collectRevenueMetrics } from "@/lib/metrics/revenue";
import type { NexusMetricsBundle } from "@/lib/metrics/types";

export async function collectAllMetrics(admin: SupabaseClient): Promise<NexusMetricsBundle> {
  const [revenue, growth, activity] = await Promise.all([
    collectRevenueMetrics(admin),
    collectGrowthMetrics(admin),
    collectActivityMetrics(admin),
  ]);

  const blackcard = await collectBlackcardMetrics(admin, growth.new_users_this_month);

  return {
    collected_at: nowIso(),
    revenue,
    growth,
    blackcard,
    activity,
  };
}
