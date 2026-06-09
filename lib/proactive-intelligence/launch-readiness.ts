import type { SupabaseClient } from "@supabase/supabase-js";
import { countDegradedWorkflows } from "@/lib/mission-health/degraded";
import { getNexusPlatformJobsSummary } from "@/lib/nexus/cron-monitor";
import { clampScore } from "@/lib/nexus/scoring";
import { loadReportContext } from "@/lib/reports/context";
import { safeCount } from "@/lib/admin/nexus-voice/safe-query";
import { buildLaunchReadinessBreakdown } from "@/lib/founder-personality/launch-summary";
import type { LaunchReadiness, LaunchReadinessStatus } from "@/lib/proactive-intelligence/types";

export function deriveLaunchReadinessStatus(score: number): LaunchReadinessStatus {
  if (score >= 85) return "strong";
  if (score >= 70) return "ready";
  if (score >= 50) return "approaching";
  return "not_ready";
}

export async function computeLaunchReadiness(admin: SupabaseClient): Promise<LaunchReadiness> {
  const [report, platformJobs, pendingReports] = await Promise.all([
    loadReportContext(admin),
    getNexusPlatformJobsSummary(admin),
    safeCount(admin, "user_reports", (query) => query.eq("status", "pending")),
  ]);

  const missionScore = report.mission.score ?? 50;
  const degradedWorkflows = countDegradedWorkflows(report.mission.workflows ?? []);
  const criticalAlerts = report.alerts.counts.critical ?? 0;
  const openIncidents = report.incidents.open.length;
  const failedJobs = platformJobs.failed_count;
  const pendingReportCount = pendingReports.data;
  const negativeObservations = (report.observations.active ?? []).filter(
    (row) => row.severity === "critical" || row.severity === "warning",
  ).length;

  const platformHealth = clampScore(missionScore);
  const openIncidentsScore = clampScore(Math.max(0, 100 - openIncidents * 25 - criticalAlerts * 15));
  const failedJobsScore = clampScore(Math.max(0, 100 - failedJobs * 20 - platformJobs.overdue_count * 10));
  const appStoreReadiness = clampScore(
    Math.max(
      0,
      100 -
        criticalAlerts * 20 -
        (report.health.systemStatus !== "operational" ? 25 : 0) -
        degradedWorkflows * 10,
    ),
  );
  const betaFeedback = clampScore(
    Math.max(0, 100 - pendingReportCount * 4 - negativeObservations * 8),
  );
  const operationalStability = clampScore(
    Math.max(
      0,
      100 -
        degradedWorkflows * 12 -
        (platformJobs.overall_status === "critical" ? 30 : platformJobs.overall_status === "degraded" ? 15 : 0),
    ),
  );

  const factors = {
    platformHealth,
    openIncidents: openIncidentsScore,
    failedJobs: failedJobsScore,
    appStoreReadiness,
    betaFeedback,
    operationalStability,
  };

  const weights = {
    platformHealth: 0.2,
    openIncidents: 0.2,
    failedJobs: 0.15,
    appStoreReadiness: 0.15,
    betaFeedback: 0.15,
    operationalStability: 0.15,
  };

  const score = clampScore(
    Object.entries(weights).reduce((total, [key, weight]) => {
      return total + factors[key as keyof typeof factors] * weight;
    }, 0),
  );

  const blockers: string[] = [];
  if (criticalAlerts > 0) blockers.push(`${criticalAlerts} critical alert(s) open`);
  if (openIncidents > 0) blockers.push(`${openIncidents} open incident(s)`);
  if (failedJobs > 0) blockers.push(`${failedJobs} failed platform job(s)`);
  if (pendingReportCount > 5) blockers.push(`${pendingReportCount} pending moderation reports`);
  if (report.health.systemStatus !== "operational") {
    blockers.push("Infrastructure is not fully operational");
  }
  if (degradedWorkflows > 0) blockers.push(`${degradedWorkflows} degraded workflow(s)`);

  const status = deriveLaunchReadinessStatus(score);
  const summary =
    status === "strong"
      ? "Platform signals support a confident launch posture."
      : status === "ready"
        ? "Launch readiness is solid with minor operational follow-ups."
        : status === "approaching"
          ? "Approaching launch readiness — resolve blockers before shipping."
          : "Not launch ready — critical operational issues need founder review.";

  const launchReadiness: LaunchReadiness = {
    score,
    status,
    factors,
    blockers: [...new Set(blockers)].slice(0, 6),
    summary,
  };

  return {
    ...launchReadiness,
    breakdown: buildLaunchReadinessBreakdown(launchReadiness),
  };
}
