import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusActionQueue } from "@/lib/action-center/summary";
import type { NexusActionCard, NexusActionCardSummary } from "@/lib/action-center/types";
import { safeCount } from "@/lib/admin/nexus-voice/safe-query";
import { getCrossSystemIntelligenceSummary } from "@/lib/cross-system-intelligence/engine";
import { loadCrossSystemContext } from "@/lib/cross-system-intelligence/context";
import { getFounderTimeline } from "@/lib/founder-copilot/timeline";
import { countDegradedWorkflows } from "@/lib/mission-health/degraded";
import { getNexusMissionControl } from "@/lib/mission-control/engine";
import { createNexusServiceClient } from "@/lib/nexus/client";
import {
  deriveFounderBrief,
  derivePlatformStatus,
  type PlatformRingStatus,
} from "@/lib/nexus/founder-derive";
import { getNexusPlatformJobsSummary } from "@/lib/nexus/cron-monitor";
import { runCached } from "@/lib/nexus/request-cache";
import { getRecommendedOperationsPlan } from "@/lib/operations-planner/engine";
import { computeLaunchReadiness } from "@/lib/proactive-intelligence/launch-readiness";
import { detectProactiveAlerts } from "@/lib/proactive-intelligence/proactive-alerts";
import { loadReportContext } from "@/lib/reports/context";
import { buildExecutivePriorities } from "@/lib/executive-command/priorities";
import {
  NEXUS_CURRENT_PHASE,
  type ExecutiveCommandSummary,
} from "@/lib/executive-command/types";

function mapPlatformStatusLabel(status: PlatformRingStatus): string {
  if (status === "critical") return "Critical";
  if (status === "warning") return "Needs attention";
  return "Operational";
}

function mapMissionStatusLabel(status: string): string {
  switch (status) {
    case "critical":
      return "Critical";
    case "at_risk":
      return "At risk";
    case "dominating":
      return "Strong";
    case "growing":
      return "Growing";
    case "stable":
      return "Stable";
    default:
      return status.replace(/_/g, " ");
  }
}

function formatRevenueStatus(mrr: number | null | undefined, changes24h: number | null | undefined): string {
  if (mrr == null) return "Revenue signals unavailable";
  if ((changes24h ?? 0) > 0) return `MRR ${mrr.toLocaleString()} with recent subscription movement`;
  return `MRR ${mrr.toLocaleString()} holding steady`;
}

function formatGrowthLabel(current: number | null, weekly: number | null, label: string): string {
  if (current == null && weekly == null) return `${label} data unavailable`;
  if ((weekly ?? 0) > 0) return `${weekly} new this week (${current ?? "—"} total)`;
  return `${current ?? "—"} active — quiet week`;
}

function summarizeActionItems(actions: NexusActionCard[]): NexusActionCardSummary[] {
  return actions
    .filter((action) => ["draft", "pending_approval", "approved"].includes(action.status))
    .slice(0, 5)
    .map((action) => ({
      id: action.id,
      action_category: action.action_category,
      action_type: action.action_type,
      title: action.title,
      summary: action.summary,
      reason: action.reason,
      suggested_outcome: action.suggested_outcome,
      status: action.status,
      approval_required: action.approval_required,
      created_by_label: action.created_by_label,
      created_at: action.created_at,
      updated_at: action.updated_at,
    }));
}

async function buildExecutiveCommandSummaryImpl(
  supabase: SupabaseClient,
): Promise<ExecutiveCommandSummary> {
  const admin = createNexusServiceClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const warnings: string[] = [];
  let partial = false;

  const [
    report,
    missionControl,
    platformJobs,
    launchReadiness,
    crossSystem,
    crossContext,
    recommendedPlan,
    actionQueue,
    founderTimeline,
    proactive,
    shopPending,
    shopPaid,
  ] = await Promise.all([
    loadReportContext(supabase),
    getNexusMissionControl(supabase),
    getNexusPlatformJobsSummary(supabase),
    computeLaunchReadiness(supabase),
    getCrossSystemIntelligenceSummary(supabase, { access: "owner" }),
    loadCrossSystemContext(supabase),
    getRecommendedOperationsPlan(supabase),
    getNexusActionQueue(supabase, { access: "owner", limit: 20 }),
    getFounderTimeline(supabase),
    detectProactiveAlerts(supabase),
    safeCount(admin, "shop_orders", (query) =>
      query.gte("created_at", since24h),
    ),
    safeCount(admin, "shop_orders", (query) =>
      query.eq("status", "paid").gte("created_at", since24h),
    ),
  ]);

  if (proactive.partial) {
    partial = true;
    warnings.push(...(proactive.warnings ?? []));
  }
  if (crossSystem.partial) {
    partial = true;
    warnings.push(...(crossSystem.warnings ?? []));
  }
  if (crossContext.partial) {
    partial = true;
    warnings.push(...crossContext.warnings);
  }
  if (shopPending.partial || shopPaid.partial) {
    partial = true;
    warnings.push("Shop order activity may be incomplete.");
  }

  const degradedWorkflows = countDegradedWorkflows(report.mission.workflows ?? []);
  const criticalAlerts = report.alerts.counts.critical ?? 0;
  const openAlerts = report.alerts.counts.active ?? 0;
  const openIncidents = report.incidents.open;

  const overallPlatformStatus = derivePlatformStatus({
    systemStatus: report.health.systemStatus ?? "unknown",
    missionStatus: report.mission.status ?? "unknown",
    criticalAlerts,
    openIncidents: openIncidents.length,
    degradedWorkflows,
  });

  const brief = deriveFounderBrief({
    platformStatus: overallPlatformStatus,
    criticalAlerts,
    openIncidents: openIncidents.length,
    pendingCommands: report.commands.counts.pending_approval ?? 0,
    newUsersWeek: report.metrics.growth.new_users_this_week ?? null,
    degradedWorkflows,
  });

  const topRisk = crossSystem.risks[0]
    ? {
        id: crossSystem.risks[0].id,
        title: crossSystem.risks[0].title,
        summary: crossSystem.risks[0].summary,
        related_route: crossSystem.risks[0].related_routes[0] ?? "/admin/nexus/intelligence",
      }
    : null;

  const topOpportunity = crossSystem.opportunities[0]
    ? {
        id: crossSystem.opportunities[0].id,
        title: crossSystem.opportunities[0].title,
        summary: crossSystem.opportunities[0].summary,
        related_route:
          crossSystem.opportunities[0].related_routes[0] ?? "/admin/nexus/intelligence",
      }
    : null;

  const credits = crossContext.credits;
  const metrics = report.metrics;

  const todaysPriorities = buildExecutivePriorities({
    risks: crossSystem.risks,
    opportunities: crossSystem.opportunities,
    launchReadiness,
    pendingApprovals: actionQueue.counts.pending_approval,
    actionItems: summarizeActionItems(actionQueue.actions),
    memoryBlockers: founderTimeline.currentBlockers,
    proactiveAlerts: proactive.alerts,
    platformHealthUrgent:
      overallPlatformStatus !== "operational" ||
      platformJobs.failed_count > 0 ||
      criticalAlerts > 0,
  });

  const recommendedFocus =
    todaysPriorities[0]?.title ??
    brief.top_focus ??
    "Review the executive summary and confirm today's operating focus.";

  return {
    collected_at: new Date().toISOString(),
    readOnly: true,
    executive_summary: {
      overall_platform_status: overallPlatformStatus,
      platform_status_label: mapPlatformStatusLabel(overallPlatformStatus),
      launch_readiness_score: launchReadiness.score,
      launch_readiness_status: launchReadiness.status,
      top_risk: topRisk,
      top_opportunity: topOpportunity,
      recommended_focus_today: recommendedFocus,
    },
    platform_health: {
      platform_status: mapMissionStatusLabel(missionControl.mission_status),
      platform_health_score: report.mission.score ?? missionControl.mission_score ?? null,
      platform_health_status: report.mission.status ?? "unknown",
      failed_jobs: platformJobs.failed_count,
      open_alerts: openAlerts,
      critical_alerts: criticalAlerts,
      recent_incidents: openIncidents.slice(0, 4).map((incident) => ({
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        href: `/admin/nexus/incidents`,
      })),
    },
    business_health: {
      revenue_status: formatRevenueStatus(
        metrics.revenue.estimated_mrr,
        metrics.revenue.recent_subscription_changes_24h,
      ),
      estimated_mrr: metrics.revenue.estimated_mrr,
      estimated_arr: metrics.revenue.estimated_arr,
      blackcard_growth: formatGrowthLabel(
        metrics.blackcard.active_members,
        null,
        "Blackcard",
      ),
      blackcard_active_members: metrics.blackcard.active_members,
      membership_growth: formatGrowthLabel(
        metrics.growth.total_users,
        metrics.growth.new_users_this_week,
        "Membership",
      ),
      total_members: metrics.growth.total_users,
      new_members_this_week: metrics.growth.new_users_this_week,
      shop_activity:
        shopPending.available === false
          ? "Shop activity unavailable"
          : `${shopPaid.data} paid / ${shopPending.data} total orders (24h)`,
      shop_orders_24h: shopPending.available ? shopPending.data : null,
      shop_paid_orders_24h: shopPaid.available ? shopPaid.data : null,
      credits_activity:
        credits.unavailable.length > 0
          ? "Credits activity partially unavailable"
          : `${credits.redemptions_this_week ?? 0} redemptions this week`,
      active_rewards: credits.active_rewards,
      redemptions_this_week: credits.redemptions_this_week,
      credit_transactions_this_week: credits.transactions_this_week,
    },
    operations_planner: {
      available: recommendedPlan.available,
      recommended_plan: recommendedPlan.plan,
      trigger: recommendedPlan.trigger,
    },
    action_center: {
      pending_approvals: actionQueue.counts.pending_approval,
      draft_actions: actionQueue.counts.draft,
      approved_awaiting_execution: actionQueue.counts.approved,
      recent_items: summarizeActionItems(actionQueue.actions),
    },
    founder_memory: {
      recent_decisions: founderTimeline.recentDecisions,
      current_blockers: founderTimeline.currentBlockers,
      completed_milestones: founderTimeline.recentAccomplishments,
      current_nexus_phase: NEXUS_CURRENT_PHASE,
    },
    todays_priorities: todaysPriorities,
    partial: partial || undefined,
    warnings: warnings.length > 0 ? [...new Set(warnings)] : undefined,
  };
}

export async function getExecutiveCommandSummary(
  supabase: SupabaseClient,
): Promise<ExecutiveCommandSummary> {
  return runCached(supabase, "nexus:executive-command", () =>
    buildExecutiveCommandSummaryImpl(supabase),
  );
}
