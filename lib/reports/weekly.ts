import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildOwnerFocus,
  buildRiskLines,
  loadReportContext,
} from "@/lib/reports/context";
import type { WeeklyExecutiveReport } from "@/lib/reports/types";

function formatCount(value: number | null, label: string): string | null {
  if (value == null) return null;
  return `${value.toLocaleString()} ${label}`;
}

export async function getWeeklyExecutiveReport(
  supabase: SupabaseClient,
): Promise<WeeklyExecutiveReport> {
  const context = await loadReportContext(supabase);
  const generatedAt = new Date().toISOString();
  const periodEnd = generatedAt;
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
  const { metrics, health, mission, alerts, incidents, observations } = context;

  const growthBullets = [
    formatCount(metrics.growth.total_users, "total users"),
    formatCount(metrics.growth.new_users_this_week, "new users this week"),
    formatCount(metrics.growth.active_profiles, "active profile estimate"),
  ].filter((line): line is string => Boolean(line));

  const revenueBullets = [
    formatCount(metrics.revenue.active_subscriptions, "active subscriptions"),
    formatCount(metrics.blackcard.active_members, "Blackcard members"),
    metrics.revenue.estimated_mrr != null
      ? `Estimated MRR $${metrics.revenue.estimated_mrr.toLocaleString()}`
      : null,
    metrics.revenue.estimated_arr != null
      ? `Estimated ARR $${metrics.revenue.estimated_arr.toLocaleString()}`
      : null,
    formatCount(metrics.revenue.recent_subscription_changes_24h, "subscription changes in 24h"),
  ].filter((line): line is string => Boolean(line));

  const engagementBullets = [
    formatCount(metrics.activity.posts_this_week, "posts this week"),
    formatCount(metrics.activity.meets_this_week, "meets created this week"),
    formatCount(metrics.activity.messages_this_week, "messages sent this week"),
  ].filter((line): line is string => Boolean(line));

  const operationalBullets = [
    `Infrastructure status: ${health.systemStatus}`,
    `User workflow status: ${mission.status}`,
    formatCount(alerts.counts.active, "active alerts"),
    formatCount(incidents.open.length, "open incidents"),
    formatCount(observations.counts.active, "active insights"),
  ].filter((line): line is string => Boolean(line));

  return {
    report_type: "weekly",
    period_start: periodStart,
    period_end: periodEnd,
    generated_at: generatedAt,
    growth_summary: {
      headline: "Community growth — last 7 days",
      bullets: growthBullets.length > 0 ? growthBullets : ["Growth metrics unavailable"],
    },
    revenue_summary: {
      headline: "Revenue intelligence — last 7 days",
      bullets: revenueBullets.length > 0 ? revenueBullets : ["Revenue metrics unavailable"],
    },
    engagement_summary: {
      headline: "Engagement — last 7 days",
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
