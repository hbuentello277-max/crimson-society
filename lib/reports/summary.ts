import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildActivityTrends,
  buildGrowthSignals,
  buildRevenueObservations,
  collectUnavailableMetrics,
  loadReportContext,
  mapInsightRefs,
  mapWorkflowRefs,
} from "@/lib/reports/context";
import type { ExecutiveReportSummary } from "@/lib/reports/types";

export async function getExecutiveReportSummary(
  supabase: SupabaseClient,
): Promise<ExecutiveReportSummary> {
  const context = await loadReportContext(supabase);
  const { metrics, alerts, incidents, observations, commands, health, mission } = context;

  const commandRecommendations =
    commands.counts.suggested +
    commands.counts.pending_approval +
    commands.counts.approved;

  return {
    collected_at: context.collected_at,
    snapshot: {
      total_users: metrics.growth.total_users,
      new_users_this_week: metrics.growth.new_users_this_week,
      new_users_this_month: metrics.growth.new_users_this_month,
      blackcard_members: metrics.blackcard.active_members,
      estimated_mrr: metrics.revenue.estimated_mrr,
      estimated_arr: metrics.revenue.estimated_arr,
      posts_this_week: metrics.activity.posts_this_week,
      meets_created_this_week: metrics.activity.meets_this_week,
      messages_this_week: metrics.activity.messages_this_week,
      active_observations: observations.counts.active,
      open_alerts: alerts.counts.active,
      open_incidents: incidents.open.length,
    },
    community_growth: {
      total_users: metrics.growth.total_users,
      new_users_this_week: metrics.growth.new_users_this_week,
      new_users_this_month: metrics.growth.new_users_this_month,
      active_members_estimate: metrics.growth.active_profiles,
      top_growth_signals: buildGrowthSignals(context),
    },
    revenue_intelligence: {
      active_subscriptions: metrics.revenue.active_subscriptions,
      blackcard_members: metrics.blackcard.active_members,
      estimated_mrr: metrics.revenue.estimated_mrr,
      estimated_arr: metrics.revenue.estimated_arr,
      recent_subscription_changes_24h: metrics.revenue.recent_subscription_changes_24h,
      revenue_observations: buildRevenueObservations(context),
    },
    engagement_intelligence: {
      posts_this_week: metrics.activity.posts_this_week,
      posts_this_month: context.monthly_activity.posts,
      meets_this_week: metrics.activity.meets_this_week,
      meets_this_month: context.monthly_activity.meets,
      messages_this_week: metrics.activity.messages_this_week,
      messages_this_month: context.monthly_activity.messages,
      activity_trends: buildActivityTrends(context),
      top_workflows: mapWorkflowRefs(mission.workflows ?? []),
    },
    operational_risk: {
      infrastructure_status: health.systemStatus,
      workflow_status: mission.status,
      active_alerts_count: alerts.counts.active,
      open_incidents_count: incidents.open.length,
      active_insights_count: observations.counts.active,
      highest_priority_insights: mapInsightRefs(observations.active),
      command_recommendations_count: commandRecommendations,
    },
    unavailable_metrics: collectUnavailableMetrics(context),
  };
}
