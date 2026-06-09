import {
  formatFounderBriefingResponse,
  formatFounderQuestionResponse,
  formatFounderRecommendationsResponse,
  formatFounderTimelineResponse,
  formatMorningBriefingResponse,
} from "@/lib/admin/nexus-voice/founder-formatters";
import type { NexusVoiceActionResult, NexusVoiceToolName } from "@/lib/admin/nexus-voice/types";
import { NEXUS_VOICE_HELP_RESPONSE } from "@/lib/admin/nexus-voice/routing";

function formatSignupNames(actionResult: NexusVoiceActionResult): string {
  const signups = actionResult.data.signups;
  if (!Array.isArray(signups) || signups.length === 0) {
    return "No new signups in the last 7 days.";
  }

  const labels = signups.map((entry) => {
    const item = entry as { username?: string | null; displayName?: string | null };
    return item.username || item.displayName || "unknown member";
  });

  return `Recent signups: ${labels.join(", ")}.`;
}

function partialSuffix(result: NexusVoiceActionResult): string {
  if (!result.partial && !result.warnings?.length) {
    return "";
  }
  const warning = result.warnings?.[0] ?? "Some data may be incomplete.";
  return ` ${warning}`;
}

type PlatformJobVoiceRow = {
  label?: string;
  status?: string;
  error_message?: string | null;
  last_run_at?: string | null;
};

function platformJobsFromResult(actionResult: NexusVoiceActionResult): PlatformJobVoiceRow[] {
  const jobs = actionResult.data.jobs;
  return Array.isArray(jobs) ? (jobs as PlatformJobVoiceRow[]) : [];
}

function formatPlatformJobsHealth(actionResult: NexusVoiceActionResult): string {
  const status = String(actionResult.data.status ?? "unknown");
  const healthyCount = Number(actionResult.data.healthyCount ?? 0);
  const failedCount = Number(actionResult.data.failedCount ?? 0);
  const overdueCount = Number(actionResult.data.overdueCount ?? 0);
  const neverRunCount = Number(actionResult.data.neverRunCount ?? 0);
  const total = platformJobsFromResult(actionResult).length;

  if (status === "healthy") {
    return `All ${total} scheduled platform jobs are healthy.${partialSuffix(actionResult)}`;
  }

  return `Platform jobs are ${status}: ${healthyCount} healthy, ${failedCount} failed, ${overdueCount} overdue, ${neverRunCount} never run.${partialSuffix(actionResult)}`;
}

function formatNexusLastRun(actionResult: NexusVoiceActionResult): string {
  const lastRun = actionResult.data.lastNexusRunAt;
  if (!lastRun) {
    return `NEXUS has no recent platform job activity logged yet.${partialSuffix(actionResult)}`;
  }

  const jobs = platformJobsFromResult(actionResult)
    .filter((job) => job.last_run_at)
    .slice(0, 3)
    .map((job) => `${job.label ?? "job"} (${job.last_run_at})`);

  const recentText = jobs.length > 0 ? ` Recent checks: ${jobs.join(", ")}.` : "";
  return `NEXUS last recorded platform activity at ${lastRun}.${recentText}${partialSuffix(actionResult)}`;
}

function formatFailedPlatformJobs(actionResult: NexusVoiceActionResult): string {
  const failed = platformJobsFromResult(actionResult).filter(
    (job) => job.status === "failed" || job.status === "overdue" || job.status === "never_run",
  );

  if (failed.length === 0) {
    return `No failed or overdue platform jobs right now.${partialSuffix(actionResult)}`;
  }

  const labels = failed
    .map((job) => {
      const reason = job.error_message ? `: ${job.error_message}` : "";
      return `${job.label ?? "job"} (${job.status ?? "unknown"})${reason}`;
    })
    .join("; ");

  return `Failed or overdue platform jobs: ${labels}.${partialSuffix(actionResult)}`;
}

export function formatNexusVoiceResponse(
  tool: NexusVoiceToolName,
  actionResult: NexusVoiceActionResult,
): string {
  switch (tool) {
    case "getMemberCount":
      return `There are ${actionResult.data.count} members on the platform.`;
    case "getBlackcardCount":
      return `There are ${actionResult.data.count} Blackcard members.`;
    case "getRecentSignups":
      return formatSignupNames(actionResult);
    case "getPendingReports":
      return `There are ${actionResult.data.count} pending moderation reports.`;
    case "getRevenueToday": {
      const formatted = String(actionResult.data.formatted ?? "$0.00");
      const orderCount = Number(actionResult.data.orderCount ?? 0);
      return `Revenue today is ${formatted} across ${orderCount} paid order${orderCount === 1 ? "" : "s"}.`;
    }
    case "getSystemStatus": {
      const status = String(actionResult.data.status ?? "unknown");
      return status === "healthy"
        ? "System status is healthy. Core services are responding."
        : "System status is degraded. Review the NEXUS checks for missing or failing services.";
    }
    case "getOrdersNeedingPickup":
      return `There are ${actionResult.data.count} paid pickup orders needing attention.${partialSuffix(actionResult)}`;
    case "getFailedMediaJobs":
      return `Media processing shows ${actionResult.data.failedCount} failed jobs and ${actionResult.data.queuedCount} queued jobs.${partialSuffix(actionResult)}`;
    case "summarizePendingReports": {
      const count = Number(actionResult.data.count ?? 0);
      const topReasons = actionResult.data.topReasons as Array<{ reason: string; count: number }> | undefined;
      const reasonText =
        topReasons && topReasons.length > 0
          ? ` Top reasons: ${topReasons.map((item) => `${item.reason} (${item.count})`).join(", ")}.`
          : "";
      return `There are ${count} pending reports.${reasonText}${partialSuffix(actionResult)}`;
    }
    case "getNexusSystemHealth":
      return `NEXUS system health is ${actionResult.data.status}. Critical alerts: ${actionResult.data.criticalAlerts}.${partialSuffix(actionResult)}`;
    case "getCheckoutHealth":
      return `Checkout health is ${actionResult.data.status}. Pending orders (24h): ${actionResult.data.pendingOrders24h}, paid: ${actionResult.data.paidOrders24h}.${partialSuffix(actionResult)}`;
    case "getSignupHealth":
      return `Signup health is ${actionResult.data.status}. New signups in the last 24 hours: ${actionResult.data.signups24h}.${partialSuffix(actionResult)}`;
    case "getMediaProcessingHealth":
      return `Media processing health is ${actionResult.data.status}. Failed jobs: ${actionResult.data.failedCount}, queued: ${actionResult.data.queuedCount}.${partialSuffix(actionResult)}`;
    case "getPushNotificationHealth":
      return `Push notification health is ${actionResult.data.status}. Failed (24h): ${actionResult.data.failed24h}, pending: ${actionResult.data.pending24h}.${partialSuffix(actionResult)}`;
    case "getCronHealth":
    case "getPlatformJobsHealth":
      return formatPlatformJobsHealth(actionResult);
    case "getNexusLastRun":
      return formatNexusLastRun(actionResult);
    case "getFailedPlatformJobs":
      return formatFailedPlatformJobs(actionResult);
    case "getRevenueRiskSummary":
      return `Revenue risk is ${actionResult.data.status}. Revenue today: ${actionResult.data.revenueToday}, pending orders: ${actionResult.data.pendingOrdersToday}.${partialSuffix(actionResult)}`;
    case "getBlackcardConversionSummary":
      return `Blackcard conversion is ${actionResult.data.conversionRatePercent}% (${actionResult.data.blackcardCount} of ${actionResult.data.memberCount} members).${partialSuffix(actionResult)}`;
    case "getDailyOperatorBriefing": {
      const attention = actionResult.data.attentionItems as string[] | undefined;
      if (!attention || attention.length === 0) {
        return `Operator briefing: no urgent items need attention right now.${partialSuffix(actionResult)}`;
      }
      return `Operator briefing: ${attention.join("; ")}.${partialSuffix(actionResult)}`;
    }
    case "getFounderBriefing":
      return formatFounderBriefingResponse(actionResult);
    case "getMorningBriefing":
      return formatMorningBriefingResponse(actionResult);
    case "getFounderRecommendations":
      return formatFounderRecommendationsResponse(actionResult);
    case "getFounderTimeline":
      return formatFounderTimelineResponse(actionResult);
    case "answerFounderQuestion":
      return formatFounderQuestionResponse(actionResult);
    default:
      return NEXUS_VOICE_HELP_RESPONSE;
  }
}

export function formatNexusVoiceConfirmSuccess(
  tool: NexusVoiceToolName,
  actionResult: NexusVoiceActionResult,
): string {
  switch (tool) {
    case "createSystemAlertDraft":
      return `System alert created: ${actionResult.data.title}.`;
    case "createAdminBriefingDraft":
      return `Briefing draft saved: ${actionResult.data.title}.`;
    case "createRunbookDraft":
      return `Runbook created: ${actionResult.data.title}.`;
    case "createNexusObservationDraft":
      return `Observation created: ${actionResult.data.title}.`;
    default:
      return "Action completed successfully.";
  }
}
