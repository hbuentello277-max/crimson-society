import type { SupabaseClient } from "@supabase/supabase-js";
import { getRevenueRiskSummary } from "@/lib/admin/nexus-voice/monitoring-tools";
import { safeCount } from "@/lib/admin/nexus-voice/safe-query";
import { getNexusCopilot } from "@/lib/copilot/engine";
import { countDegradedWorkflows } from "@/lib/mission-health/degraded";
import type { FounderBriefing } from "@/lib/founder-copilot/types";
import { derivePlatformStatus } from "@/lib/nexus/founder-derive";
import { getNexusPlatformJobsSummary } from "@/lib/nexus/cron-monitor";
import { loadReportContext } from "@/lib/reports/context";

export async function getFounderBriefing(admin: SupabaseClient): Promise<FounderBriefing> {
  const [report, platformJobs, pendingReports, revenueToday, copilot] = await Promise.all([
    loadReportContext(admin),
    getNexusPlatformJobsSummary(admin),
    safeCount(admin, "user_reports", (query) => query.eq("status", "pending")),
    getRevenueRiskSummary(admin),
    getNexusCopilot(admin),
  ]);

  const degradedWorkflows = countDegradedWorkflows(report.mission.workflows ?? []);
  const platformStatus = derivePlatformStatus({
    systemStatus: report.health.systemStatus ?? "unknown",
    missionStatus: report.mission.status ?? "unknown",
    criticalAlerts: report.alerts.counts.critical ?? 0,
    openIncidents: report.incidents.open.length,
    degradedWorkflows,
  });

  const failedJobs = platformJobs.jobs
    .filter((job) => job.status === "failed" || job.status === "overdue" || job.status === "never_run")
    .slice(0, 5)
    .map((job) => ({
      label: job.label,
      status: job.status,
      error: job.error_message,
    }));

  const recommendedActions = [
    ...copilot.recommended_next_steps.slice(0, 3),
    ...(platformJobs.failed_count > 0
      ? [`Review ${platformJobs.failed_count} failed platform job(s) on Platform Status`]
      : []),
    ...((report.alerts.counts.critical ?? 0) > 0
      ? [`Resolve ${report.alerts.counts.critical} critical alert(s)`]
      : []),
  ].slice(0, 6);

  const warnings: string[] = [];
  if (pendingReports.partial) warnings.push("Pending report count may be incomplete.");
  if (revenueToday.partial) warnings.push("Revenue data may be incomplete.");

  const paidOrdersToday = Number(revenueToday.data.paidOrdersToday ?? 0);
  const revenueTodayFormatted = String(revenueToday.data.revenueToday ?? null);

  return {
    generatedAt: new Date().toISOString(),
    platformHealth: {
      status: platformStatus,
      missionScore: report.mission.score ?? null,
      missionStatus: report.mission.status ?? "unknown",
      criticalAlerts: report.alerts.counts.critical ?? 0,
      openIncidents: report.incidents.open.length,
      degradedWorkflows,
    },
    membershipGrowth: {
      totalUsers: report.metrics.growth.total_users,
      newUsersToday: report.metrics.growth.new_users_today,
      newUsersThisWeek: report.metrics.growth.new_users_this_week,
      newUsersThisMonth: report.metrics.growth.new_users_this_month,
    },
    blackcardGrowth: {
      activeMembers: report.metrics.blackcard.active_members,
      conversionEstimate: report.metrics.blackcard.conversion_estimate,
      monthlyPlanCount: report.metrics.blackcard.monthly_plan_count,
      yearlyPlanCount: report.metrics.blackcard.yearly_plan_count,
    },
    revenueSummary: {
      estimatedMrr: report.metrics.revenue.estimated_mrr,
      estimatedArr: report.metrics.revenue.estimated_arr,
      revenueToday: revenueTodayFormatted,
      paidOrdersToday,
    },
    openAlerts: {
      active: report.alerts.counts.active ?? 0,
      critical: report.alerts.counts.critical ?? 0,
      topAlerts: (report.alerts.active ?? []).slice(0, 3).map((alert) => ({
        title: alert.title,
        severity: alert.severity,
      })),
    },
    failedPlatformJobs: {
      overallStatus: platformJobs.overall_status,
      failedCount: platformJobs.failed_count,
      overdueCount: platformJobs.overdue_count,
      failedJobs,
    },
    pendingReports: pendingReports.data,
    recommendedActions,
    partial: pendingReports.partial || revenueToday.partial,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
