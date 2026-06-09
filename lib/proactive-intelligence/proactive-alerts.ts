import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCheckoutHealth,
  getMediaProcessingHealth,
  getPushNotificationHealth,
  getRevenueRiskSummary,
  getSignupHealth,
} from "@/lib/admin/nexus-voice/monitoring-tools";
import { getNexusPlatformJobsSummary } from "@/lib/nexus/cron-monitor";
import { loadReportContext } from "@/lib/reports/context";
import type { ProactiveAlert, ProactiveAlertSeverity } from "@/lib/proactive-intelligence/types";

function mapHealthStatus(status: string | undefined): ProactiveAlertSeverity {
  if (status === "critical") return "critical";
  if (status === "warning" || status === "degraded") return "warning";
  return "info";
}

export async function detectProactiveAlerts(admin: SupabaseClient): Promise<{
  alerts: ProactiveAlert[];
  partial: boolean;
  warnings: string[];
}> {
  const [report, platformJobs, checkout, revenue, signups, media, push] = await Promise.all([
    loadReportContext(admin),
    getNexusPlatformJobsSummary(admin),
    getCheckoutHealth(admin),
    getRevenueRiskSummary(admin),
    getSignupHealth(admin),
    getMediaProcessingHealth(admin),
    getPushNotificationHealth(admin),
  ]);

  const generatedAt = new Date().toISOString();
  const alerts: ProactiveAlert[] = [];
  const warnings: string[] = [];
  let partial = false;

  if (checkout.partial || revenue.partial || signups.partial || media.partial || push.partial) {
    partial = true;
    warnings.push("Some proactive alert signals may be incomplete.");
  }

  if (platformJobs.failed_count > 0) {
    alerts.push({
      id: "failed-jobs",
      category: "failed_jobs",
      severity: platformJobs.failed_count > 2 ? "critical" : "warning",
      title: "Failed platform jobs",
      summary: `${platformJobs.failed_count} scheduled job(s) failed. Review Platform Status.`,
      detectedAt: generatedAt,
      relatedRoute: "/admin/nexus/mission-control",
    });
  }

  if (platformJobs.overdue_count > 0) {
    alerts.push({
      id: "overdue-jobs",
      category: "failed_jobs",
      severity: "warning",
      title: "Overdue platform jobs",
      summary: `${platformJobs.overdue_count} job(s) are overdue.`,
      detectedAt: generatedAt,
      relatedRoute: "/admin/nexus/mission-control",
    });
  }

  if (revenue.data.status === "warning" || revenue.data.status === "critical") {
    alerts.push({
      id: "revenue-risk",
      category: "revenue_drop",
      severity: mapHealthStatus(String(revenue.data.status)),
      title: "Revenue risk detected",
      summary: `Today's revenue is ${revenue.data.revenueToday ?? "n/a"} with elevated cancellations or pending orders.`,
      detectedAt: generatedAt,
      relatedRoute: "/admin/nexus/metrics",
    });
  }

  if (checkout.data.status === "warning" || checkout.data.status === "critical") {
    alerts.push({
      id: "checkout-issues",
      category: "checkout",
      severity: mapHealthStatus(String(checkout.data.status)),
      title: "Checkout issues",
      summary: `${checkout.data.pendingOrders24h ?? 0} pending and ${checkout.data.cancelledOrders24h ?? 0} cancelled orders in the last 24h.`,
      detectedAt: generatedAt,
      relatedRoute: "/admin/nexus/mission-health",
    });
  }

  if (signups.data.status === "warning") {
    alerts.push({
      id: "membership-drop",
      category: "membership",
      severity: "warning",
      title: "Signup slowdown",
      summary: "No new signups recorded in the last 24 hours.",
      detectedAt: generatedAt,
      relatedRoute: "/admin/nexus/metrics",
    });
  }

  const queuedMedia = Number(media.data.queuedCount ?? 0);
  const failedMedia = Number(media.data.failedCount ?? 0);
  if (failedMedia > 0 || queuedMedia > 10) {
    alerts.push({
      id: "media-queue",
      category: "media_queue",
      severity: failedMedia > 3 ? "critical" : queuedMedia > 25 ? "warning" : "info",
      title: "Media processing backlog",
      summary: `${failedMedia} failed and ${queuedMedia} queued media job(s).`,
      detectedAt: generatedAt,
      relatedRoute: "/admin/nexus/mission-health",
    });
  }

  if (push.data.status === "warning" || push.data.status === "critical") {
    alerts.push({
      id: "push-failures",
      category: "push_failure",
      severity: mapHealthStatus(String(push.data.status)),
      title: "Push notification failures",
      summary: `${push.data.failed24h ?? 0} failed push jobs in the last 24h.`,
      detectedAt: generatedAt,
      relatedRoute: "/admin/nexus/mission-health",
    });
  }

  if (report.health.systemStatus !== "operational") {
    alerts.push({
      id: "platform-health",
      category: "platform_health",
      severity: report.health.systemStatus === "critical" ? "critical" : "warning",
      title: "Infrastructure degraded",
      summary: `System health is ${report.health.systemStatus ?? "unknown"}.`,
      detectedAt: generatedAt,
      relatedRoute: "/admin/nexus/system-health",
    });
  }

  for (const incident of report.incidents.open.slice(0, 3)) {
    alerts.push({
      id: `incident:${incident.id}`,
      category: "incident",
      severity: incident.severity === "critical" ? "critical" : "warning",
      title: incident.title,
      summary: incident.impact_summary || `Incident status: ${incident.status}`,
      detectedAt: incident.created_at ?? generatedAt,
      relatedRoute: "/admin/nexus/incidents",
    });
  }

  for (const alert of (report.alerts.active ?? []).slice(0, 3)) {
    alerts.push({
      id: `alert:${alert.id}`,
      category: "alert",
      severity: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info",
      title: alert.title,
      summary: alert.message,
      detectedAt: alert.created_at ?? generatedAt,
      relatedRoute: "/admin/nexus/alerts",
    });
  }

  const severityRank = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return { alerts, partial, warnings };
}
