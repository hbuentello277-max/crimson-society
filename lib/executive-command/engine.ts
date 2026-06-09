import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusActionQueue } from "@/lib/action-center/summary";
import { getCrossSystemIntelligenceSummary } from "@/lib/cross-system-intelligence/engine";
import { loadCrossSystemContext } from "@/lib/cross-system-intelligence/context";
import { getFounderTimeline } from "@/lib/founder-copilot/timeline";
import {
  buildExecutivePriorities,
  emptyExecutivePriorities,
} from "@/lib/executive-command/priorities";
import type { ExecutiveCommandSummary } from "@/lib/executive-command/types";
import { getRecommendedOperationsPlan } from "@/lib/operations-planner/engine";
import { listOperationsPlans } from "@/lib/operations-planner/manager";
import { derivePlatformStatus } from "@/lib/nexus/founder-derive";
import { countDegradedWorkflows } from "@/lib/mission-health/degraded";
import { getNexusPlatformJobsSummary } from "@/lib/nexus/cron-monitor";
import { NEXUS_LABELS } from "@/lib/nexus/terminology";
import { runCached } from "@/lib/nexus/request-cache";
import { loadReportContext } from "@/lib/reports/context";
import { computeLaunchReadiness } from "@/lib/proactive-intelligence/launch-readiness";
import type { ExecutiveAccess } from "@/lib/executive-command/types";

const CURRENT_NEXUS_PHASE = "Phase 14 — Executive Command Center";

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "n/a";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function getExecutiveCommandSummary(
  supabase: SupabaseClient,
  access: ExecutiveAccess = "owner",
): Promise<ExecutiveCommandSummary> {
  return runCached(supabase, `nexus:executive-command:${access}`, () =>
    buildExecutiveCommandSummary(supabase, access),
  );
}

async function buildExecutiveCommandSummary(
  supabase: SupabaseClient,
  access: ExecutiveAccess,
): Promise<ExecutiveCommandSummary> {
  const warnings: string[] = [];
  let partial = false;

  const [
    report,
    platformJobs,
    intelligence,
    launchReadiness,
    founderTimeline,
    crossContext,
    recommendedPlan,
    savedPlans,
    actionQueue,
  ] = await Promise.all([
    loadReportContext(supabase),
    getNexusPlatformJobsSummary(supabase),
    getCrossSystemIntelligenceSummary(supabase, { access: "owner" }),
    computeLaunchReadiness(supabase),
    getFounderTimeline(supabase),
    loadCrossSystemContext(supabase).catch(() => null),
    getRecommendedOperationsPlan(supabase).catch(() => ({
      available: false,
      plan: null,
      trigger: null,
      readOnly: true as const,
    })),
    listOperationsPlans(supabase, 1).catch(() => []),
    access === "owner"
      ? getNexusActionQueue(supabase, { access: "owner", status: "all", limit: 20 }).catch(
          () => null,
        )
      : Promise.resolve(null),
  ]);

  if (intelligence.partial) {
    partial = true;
    warnings.push(...(intelligence.warnings ?? []));
  }
  if (crossContext?.partial) {
    partial = true;
    warnings.push(...(crossContext.warnings ?? []));
  }

  const degradedWorkflows = countDegradedWorkflows(report.mission.workflows ?? []);
  const platformStatus = derivePlatformStatus({
    systemStatus: report.health.systemStatus ?? "unknown",
    missionStatus: report.mission.status ?? "unknown",
    criticalAlerts: report.alerts.counts?.critical ?? 0,
    openIncidents: report.incidents.open?.length ?? 0,
    degradedWorkflows,
  });

  const topRisk = intelligence.risks[0] ?? null;
  const topOpportunity = intelligence.opportunities[0] ?? null;

  const priorities = buildExecutivePriorities({
    risks: intelligence.risks.map((risk) => ({
      id: risk.id,
      title: risk.title,
      summary: risk.summary,
      impact_score: risk.impact_score,
    })),
    opportunities: intelligence.opportunities.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      impact_score: item.impact_score,
    })),
    launchBlockers: launchReadiness.blockers,
    pendingApprovals: actionQueue?.counts.pending_approval ?? 0,
    memoryBlockers: founderTimeline.currentBlockers.map((entry) => ({
      title: entry.title,
      summary: entry.summary,
    })),
    platformStatus,
    failedJobs: platformJobs.failed_count,
    openIncidents: report.incidents.open?.length ?? 0,
  });

  const todaysPriorities = priorities.length > 0 ? priorities : emptyExecutivePriorities();
  const recommendedFocus =
    todaysPriorities[0]?.title ??
    topRisk?.title ??
    "Review Platform Status and today's executive summary.";

  const operationsPlan =
    savedPlans[0] ?? (recommendedPlan.available ? recommendedPlan.plan : null);

  const credits = crossContext?.credits;
  const creditsActivity =
    credits?.redemptions_this_week != null
      ? `${credits.redemptions_this_week} redemptions this week`
      : "Credits activity unavailable";

  return {
    collected_at: report.collected_at,
    access,
    executive_summary: {
      overall_platform_status: platformStatus,
      launch_readiness_score: launchReadiness.score,
      launch_readiness_status: launchReadiness.status,
      top_risk: topRisk?.title ?? null,
      top_opportunity: topOpportunity?.title ?? null,
      recommended_focus_today: recommendedFocus,
    },
    platform_health: {
      platform_status: platformStatus,
      platform_health: report.mission.status ?? "unknown",
      platform_health_score: report.mission.score ?? null,
      failed_jobs: platformJobs.failed_count,
      open_alerts: report.alerts.counts?.active ?? 0,
      recent_incidents: (report.incidents.open ?? []).slice(0, 3).map((incident) => ({
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
      })),
    },
    business_health: {
      revenue_status:
        report.metrics.revenue.estimated_mrr != null
          ? `Estimated MRR ${formatMoney(report.metrics.revenue.estimated_mrr)}`
          : "Revenue metrics unavailable",
      estimated_mrr: report.metrics.revenue.estimated_mrr ?? null,
      blackcard_growth:
        report.metrics.blackcard.active_members != null
          ? `${report.metrics.blackcard.active_members.toLocaleString()} active members`
          : "Blackcard metrics unavailable",
      blackcard_members: report.metrics.blackcard.active_members ?? null,
      membership_growth:
        report.metrics.growth.new_users_this_week != null
          ? `${report.metrics.growth.new_users_this_week} new members this week`
          : "Membership metrics unavailable",
      new_members_this_week: report.metrics.growth.new_users_this_week ?? null,
      shop_activity: `Stripe webhook processed ${report.metrics.revenue.stripe_webhook.processed_1h ?? "n/a"} events in the last hour`,
      credits_activity: creditsActivity,
    },
    operations_planner: {
      available: Boolean(operationsPlan),
      plan: operationsPlan,
    },
    action_center: {
      pending_approval: actionQueue?.counts.pending_approval ?? 0,
      draft: actionQueue?.counts.draft ?? 0,
      approved_awaiting_execution: actionQueue?.counts.approved ?? 0,
      recent_titles: (actionQueue?.actions ?? [])
        .slice(0, 4)
        .map((action) => action.title),
    },
    founder_memory: {
      recent_decisions: founderTimeline.recentDecisions.slice(0, 3).map((entry) => ({
        title: entry.title,
        summary: entry.summary,
      })),
      current_blockers: founderTimeline.currentBlockers.slice(0, 3).map((entry) => ({
        title: entry.title,
        summary: entry.summary,
      })),
      completed_milestones: founderTimeline.recentAccomplishments.slice(0, 3).map((entry) => ({
        title: entry.title,
        summary: entry.summary,
      })),
      current_phase: CURRENT_NEXUS_PHASE,
    },
    todays_priorities: todaysPriorities,
    readOnly: true,
    partial: partial || undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function formatExecutiveSummaryForVoice(summary: ExecutiveCommandSummary): string {
  const exec = summary.executive_summary;
  const priorities = summary.todays_priorities
    .slice(0, 3)
    .map((item) => `${item.title} (${item.urgency})`)
    .join("; ");

  return [
    `Executive Command Center summary.`,
    `${NEXUS_LABELS.platformStatus}: ${exec.overall_platform_status}.`,
    `Launch readiness ${exec.launch_readiness_score}/100.`,
    exec.top_risk ? `Top risk: ${exec.top_risk}.` : "No major risk flagged.",
    exec.top_opportunity ? `Top opportunity: ${exec.top_opportunity}.` : "No major opportunity flagged.",
    `Focus today: ${exec.recommended_focus_today}.`,
    priorities ? `Today's priorities: ${priorities}.` : null,
    summary.action_center.pending_approval > 0
      ? `${summary.action_center.pending_approval} actions need approval.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
}
