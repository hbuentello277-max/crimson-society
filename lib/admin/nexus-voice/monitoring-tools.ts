import type { SupabaseClient } from "@supabase/supabase-js";
import { isNexusVoiceAiConfigured } from "@/lib/admin/nexus-voice/config";
import { getFailedMediaJobs, getOrdersNeedingPickup, summarizePendingReports } from "@/lib/admin/nexus-voice/action-tools";
import { safeCount, safeSelect, collectWarnings } from "@/lib/admin/nexus-voice/safe-query";
import type { NexusVoiceActionResult, NexusVoiceMonitoringToolName } from "@/lib/admin/nexus-voice/types";

function startOfUtcDayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function formatCentsUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function healthStatusFromCounts(input: {
  failed?: number;
  pending?: number;
  degraded?: boolean;
}): "healthy" | "warning" | "critical" | "unknown" {
  if (input.degraded) return "unknown";
  const failed = input.failed ?? 0;
  const pending = input.pending ?? 0;
  if (failed > 5) return "critical";
  if (failed > 0 || pending > 10) return "warning";
  return "healthy";
}

export async function getNexusSystemHealth(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const [integrations, workflows, alerts] = await Promise.all([
    safeSelect<{ slug: string; status: string | null }>(
      admin,
      "nexus_integrations",
      "slug, status",
      (query) => query.order("slug", { ascending: true }).limit(20),
    ),
    safeSelect<{ slug: string; status: string | null; score: number | null }>(
      admin,
      "nexus_mission_workflows",
      "slug, status, score",
      (query) => query.order("slug", { ascending: true }).limit(20),
    ),
    safeCount(admin, "nexus_alerts", (query) =>
      query.in("status", ["active", "acknowledged"]).eq("severity", "critical"),
    ),
  ]);

  const degradedIntegrations = integrations.data.filter((row) => row.status && row.status !== "healthy");
  const degradedWorkflows = workflows.data.filter((row) => row.status && !["healthy", "operational"].includes(row.status));

  const warnings = collectWarnings([integrations, workflows, alerts]);
  const status = healthStatusFromCounts({
    failed: degradedIntegrations.length + degradedWorkflows.length + alerts.data,
    degraded: integrations.partial || workflows.partial,
  });

  return {
    tool: "getNexusSystemHealth",
    data: {
      status,
      criticalAlerts: alerts.data,
      degradedIntegrations: degradedIntegrations.map((row) => row.slug),
      degradedWorkflows: degradedWorkflows.map((row) => row.slug),
      checkedAt: new Date().toISOString(),
    },
    partial: integrations.partial || workflows.partial || alerts.partial,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export async function getCheckoutHealth(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [pending, paid, cancelled] = await Promise.all([
    safeCount(admin, "shop_orders", (query) => query.eq("status", "pending").gte("created_at", since)),
    safeCount(admin, "shop_orders", (query) => query.eq("status", "paid").gte("created_at", since)),
    safeCount(admin, "shop_orders", (query) => query.eq("status", "cancelled").gte("created_at", since)),
  ]);

  const warnings = collectWarnings([pending, paid, cancelled]);
  const status = healthStatusFromCounts({
    failed: cancelled.data,
    pending: pending.data,
    degraded: pending.partial,
  });

  return {
    tool: "getCheckoutHealth",
    data: {
      status,
      pendingOrders24h: pending.data,
      paidOrders24h: paid.data,
      cancelledOrders24h: cancelled.data,
      windowHours: 24,
    },
    partial: pending.partial || paid.partial || cancelled.partial,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export async function getSignupHealth(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const signups = await safeCount(admin, "profiles", (query) =>
    query.gte("created_at", since).neq("status", "deleted"),
  );

  const status =
    signups.partial || signups.error
      ? "unknown"
      : signups.data === 0
        ? "warning"
        : "healthy";

  return {
    tool: "getSignupHealth",
    data: {
      status,
      signups24h: signups.data,
      windowHours: 24,
    },
    partial: signups.partial,
    warnings: signups.partial ? ["Signup metrics may be incomplete."] : undefined,
  };
}

export async function getMediaProcessingHealth(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const result = await getFailedMediaJobs(admin);
  const status = healthStatusFromCounts({
    failed: Number(result.data.failedCount ?? 0),
    pending: Number(result.data.queuedCount ?? 0),
    degraded: result.partial,
  });

  return {
    tool: "getMediaProcessingHealth",
    data: { status, ...result.data },
    partial: result.partial,
    warnings: result.warnings,
  };
}

export async function getPushNotificationHealth(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [failed, pending, sent] = await Promise.all([
    safeCount(admin, "push_notification_jobs", (query) =>
      query.eq("status", "failed").gte("created_at", since),
    ),
    safeCount(admin, "push_notification_jobs", (query) =>
      query.eq("status", "pending").gte("created_at", since),
    ),
    safeCount(admin, "push_notification_jobs", (query) =>
      query.eq("status", "sent").gte("created_at", since),
    ),
  ]);

  const warnings = collectWarnings([failed, pending, sent]);
  const status = healthStatusFromCounts({
    failed: failed.data,
    pending: pending.data,
    degraded: failed.partial,
  });

  return {
    tool: "getPushNotificationHealth",
    data: {
      status,
      failed24h: failed.data,
      pending24h: pending.data,
      sent24h: sent.data,
      windowHours: 24,
    },
    partial: failed.partial || pending.partial || sent.partial,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export async function getCronHealth(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const activity = await safeSelect<{
    action: string | null;
    created_at: string | null;
  }>(admin, "nexus_activity_log", "action, created_at", (query) =>
    query.gte("created_at", since).order("created_at", { ascending: false }).limit(12),
  );

  const cronActions = activity.data.filter((row) =>
    String(row.action ?? "").includes("cron") || String(row.action ?? "").includes("completed"),
  );

  const status =
    activity.partial || activity.error
      ? "unknown"
      : cronActions.length === 0
        ? "warning"
        : "healthy";

  return {
    tool: "getCronHealth",
    data: {
      status,
      recentCronEvents: cronActions.length,
      recentActivity: activity.data,
      windowHours: 6,
    },
    partial: activity.partial,
    warnings: activity.partial ? ["Cron activity log may be unavailable."] : undefined,
  };
}

export async function getRevenueRiskSummary(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const startIso = startOfUtcDayIso();
  const [paidToday, pendingToday, cancelledToday] = await Promise.all([
    safeSelect<{ total_cents: number }>(admin, "shop_orders", "total_cents", (query) =>
      query.eq("status", "paid").gte("created_at", startIso),
    ),
    safeCount(admin, "shop_orders", (query) => query.eq("status", "pending").gte("created_at", startIso)),
    safeCount(admin, "shop_orders", (query) => query.eq("status", "cancelled").gte("created_at", startIso)),
  ]);

  const totalCents = paidToday.data.reduce((sum, row) => sum + Number(row.total_cents ?? 0), 0);
  const status =
    cancelledToday.data > 3 || (totalCents === 0 && pendingToday.data > 5)
      ? "warning"
      : "healthy";

  return {
    tool: "getRevenueRiskSummary",
    data: {
      status,
      revenueToday: formatCentsUsd(totalCents),
      paidOrdersToday: paidToday.data.length,
      pendingOrdersToday: pendingToday.data,
      cancelledOrdersToday: cancelledToday.data,
    },
    partial: paidToday.partial || pendingToday.partial || cancelledToday.partial,
    warnings: collectWarnings([paidToday, pendingToday, cancelledToday]),
  };
}

export async function getBlackcardConversionSummary(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const [members, blackcard] = await Promise.all([
    safeCount(admin, "profiles", (query) => query.neq("status", "deleted")),
    safeCount(admin, "profiles", (query) =>
      query
        .neq("status", "deleted")
        .or(
          "membership_tier.eq.blackcard,membership_tier.eq.founding,is_founding_blackcard.eq.true,and(is_premium.eq.true,premium_tier.eq.blackcard)",
        ),
    ),
  ]);

  const memberCount = members.data;
  const blackcardCount = blackcard.data;
  const conversionRate =
    memberCount > 0 ? Number(((blackcardCount / memberCount) * 100).toFixed(1)) : 0;

  return {
    tool: "getBlackcardConversionSummary",
    data: {
      memberCount,
      blackcardCount,
      conversionRatePercent: conversionRate,
    },
    partial: members.partial || blackcard.partial,
    warnings: collectWarnings([members, blackcard]),
  };
}

export async function getDailyOperatorBriefing(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const [
    pendingReports,
    failedMedia,
    pickupOrders,
    checkout,
    push,
    revenue,
    signups,
    system,
  ] = await Promise.all([
    summarizePendingReports(admin),
    getFailedMediaJobs(admin),
    getOrdersNeedingPickup(admin),
    getCheckoutHealth(admin),
    getPushNotificationHealth(admin),
    getRevenueRiskSummary(admin),
    getSignupHealth(admin),
    getNexusSystemHealth(admin),
  ]);

  const attention: string[] = [];
  if (Number(pendingReports.data.count ?? 0) > 0) {
    attention.push(`${pendingReports.data.count} pending moderation reports`);
  }
  if (Number(failedMedia.data.failedCount ?? 0) > 0) {
    attention.push(`${failedMedia.data.failedCount} failed media jobs`);
  }
  if (Number(pickupOrders.data.count ?? 0) > 0) {
    attention.push(`${pickupOrders.data.count} pickup orders need attention`);
  }
  if (checkout.data.status === "warning" || checkout.data.status === "critical") {
    attention.push("Checkout activity needs review");
  }
  if (push.data.status === "warning" || push.data.status === "critical") {
    attention.push("Push delivery issues detected");
  }
  if (system.data.status === "warning" || system.data.status === "critical") {
    attention.push("Platform health is degraded");
  }

  const partial =
    pendingReports.partial ||
    failedMedia.partial ||
    pickupOrders.partial ||
    checkout.partial ||
    push.partial ||
    revenue.partial ||
    signups.partial ||
    system.partial;

  return {
    tool: "getDailyOperatorBriefing",
    data: {
      generatedAt: new Date().toISOString(),
      attentionItems: attention,
      highlights: {
        revenueToday: revenue.data.revenueToday,
        signups24h: signups.data.signups24h,
        pendingReports: pendingReports.data.count,
        failedMediaJobs: failedMedia.data.failedCount,
        pickupOrders: pickupOrders.data.count,
        platformStatus: system.data.status,
      },
      openAiConfigured: isNexusVoiceAiConfigured(),
    },
    partial,
    warnings: partial ? ["Operator briefing compiled with partial data."] : undefined,
  };
}

const MONITORING_RUNNERS: Record<
  NexusVoiceMonitoringToolName,
  (admin: SupabaseClient) => Promise<NexusVoiceActionResult>
> = {
  getNexusSystemHealth,
  getCheckoutHealth,
  getSignupHealth,
  getMediaProcessingHealth,
  getPushNotificationHealth,
  getCronHealth,
  getRevenueRiskSummary,
  getBlackcardConversionSummary,
  getDailyOperatorBriefing,
};

export async function runNexusVoiceMonitoringTool(
  tool: NexusVoiceMonitoringToolName,
  admin: SupabaseClient,
): Promise<NexusVoiceActionResult> {
  return MONITORING_RUNNERS[tool](admin);
}
