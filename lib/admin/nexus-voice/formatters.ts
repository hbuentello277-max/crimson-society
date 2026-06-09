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
      return `Cron health is ${actionResult.data.status}. Recent cron-related events: ${actionResult.data.recentCronEvents}.${partialSuffix(actionResult)}`;
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
