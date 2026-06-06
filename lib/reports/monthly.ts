import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildOwnerFocus,
  buildRiskLines,
  loadReportContext,
} from "@/lib/reports/context";
import type { MonthlyExecutiveReport } from "@/lib/reports/types";

function formatCount(value: number | null, label: string): string | null {
  if (value == null) return null;
  return `${value.toLocaleString()} ${label}`;
}

export async function getMonthlyExecutiveReport(
  supabase: SupabaseClient,
): Promise<MonthlyExecutiveReport> {
  const context = await loadReportContext(supabase);
  const generatedAt = new Date().toISOString();
  const periodEnd = generatedAt;
  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  const { metrics, health, mission, alerts, incidents, observations } = context;

  const growthBullets = [
    formatCount(metrics.growth.total_users, "total users"),
    formatCount(metrics.growth.new_users_this_month, "new users in the last 30 days"),
    formatCount(metrics.growth.active_profiles, "active profile estimate"),
    metrics.blackcard.conversion_estimate_available && metrics.blackcard.conversion_estimate != null
      ? `Blackcard conversion estimate ${Math.round(metrics.blackcard.conversion_estimate * 100)}%`
      : null,
  ].filter((line): line is string => Boolean(line));

  const revenueBullets = [
    formatCount(metrics.revenue.active_subscriptions, "active subscriptions"),
    formatCount(metrics.blackcard.active_members, "Blackcard members"),
    formatCount(metrics.blackcard.trialing_members, "trialing members"),
    metrics.revenue.estimated_mrr != null
      ? `Estimated MRR $${metrics.revenue.estimated_mrr.toLocaleString()}`
      : null,
    metrics.revenue.estimated_arr != null
      ? `Estimated ARR $${metrics.revenue.estimated_arr.toLocaleString()}`
      : null,
  ].filter((line): line is string => Boolean(line));

  const engagementBullets = [
    formatCount(context.monthly_activity.posts, "posts in the last 30 days"),
    formatCount(context.monthly_activity.meets, "meets created in the last 30 days"),
    formatCount(context.monthly_activity.messages, "messages sent in the last 30 days"),
    formatCount(metrics.activity.posts_this_week, "posts this week (snapshot)"),
    formatCount(metrics.activity.messages_this_week, "messages this week (snapshot)"),
  ].filter((line): line is string => Boolean(line));

  const operationalBullets = [
    `Infrastructure status: ${health.systemStatus}`,
    `User workflow status: ${mission.status}`,
    `Mission health score: ${mission.score ?? "—"}`,
    formatCount(alerts.counts.active, "active alerts"),
    formatCount(incidents.open.length, "open incidents"),
    formatCount(observations.counts.active, "active insights"),
  ].filter((line): line is string => Boolean(line));

  return {
    report_type: "monthly",
    period_start: periodStart,
    period_end: periodEnd,
    generated_at: generatedAt,
    total_growth: {
      headline: "Total growth — last 30 days",
      bullets: growthBullets.length > 0 ? growthBullets : ["Growth metrics unavailable"],
    },
    revenue_summary: {
      headline: "Revenue intelligence — last 30 days",
      bullets: revenueBullets.length > 0 ? revenueBullets : ["Revenue metrics unavailable"],
    },
    engagement_summary: {
      headline: "Engagement — last 30 days",
      bullets: engagementBullets.length > 0 ? engagementBullets : ["Engagement metrics unavailable"],
    },
    operational_summary: {
      headline: "Operational posture — current",
      bullets: operationalBullets,
    },
    risks: buildRiskLines(context),
    recommended_owner_focus: buildOwnerFocus(context),
    unavailable_metrics: context.monthly_activity.unavailable,
  };
}
