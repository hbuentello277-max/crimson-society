import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusCopilot } from "@/lib/copilot/engine";
import { rankFounderRecommendations } from "@/lib/founder-personality/priority";
import type { FounderRecommendation, FounderRecommendations } from "@/lib/founder-copilot/types";
import { getNexusPlatformJobsSummary } from "@/lib/nexus/cron-monitor";
import { getNexusPlanning } from "@/lib/planning/engine";
import { loadReportContext } from "@/lib/reports/context";
import { safeCount } from "@/lib/admin/nexus-voice/safe-query";

export async function getFounderRecommendations(
  admin: SupabaseClient,
): Promise<FounderRecommendations> {
  const [report, copilot, platformJobs, pendingReports, planning] = await Promise.all([
    loadReportContext(admin),
    getNexusCopilot(admin),
    getNexusPlatformJobsSummary(admin),
    safeCount(admin, "user_reports", (query) => query.eq("status", "pending")),
    getNexusPlanning(admin),
  ]);

  const recommendations: FounderRecommendation[] = [];
  let priority = 1;

  for (const focus of copilot.daily_focus) {
    recommendations.push({
      id: focus.id,
      priority: priority++,
      title: focus.title,
      reason: focus.reason,
      category:
        focus.id.includes("alert") || focus.id.includes("incident")
          ? "platform"
          : focus.id.includes("command")
            ? "launch"
            : "growth",
      relatedRoute: focus.related_route,
    });
  }

  if (platformJobs.failed_count > 0 || platformJobs.overdue_count > 0) {
    recommendations.push({
      id: "platform-jobs:failed",
      priority: priority++,
      title: "Review failed platform jobs",
      reason: `${platformJobs.failed_count} failed and ${platformJobs.overdue_count} overdue scheduled job(s) need attention.`,
      category: "jobs",
      relatedRoute: "/admin/nexus/mission-control",
    });
  }

  if (pendingReports.data > 0) {
    recommendations.push({
      id: "reports:pending",
      priority: priority++,
      title: "Clear pending moderation reports",
      reason: `${pendingReports.data} report(s) are waiting in the moderation queue.`,
      category: "reports",
      relatedRoute: "/admin",
    });
  }

  for (const signal of copilot.declining_signals.slice(0, 3)) {
    recommendations.push({
      id: signal.id,
      priority: priority++,
      title: signal.label,
      reason: signal.summary,
      category: "metrics",
      relatedRoute: "/admin/nexus/metrics",
    });
  }

  if (copilot.top_risk) {
    recommendations.push({
      id: "risk:top",
      priority: priority++,
      title: copilot.top_risk.title,
      reason: copilot.top_risk.summary,
      category: "risk",
      relatedRoute: copilot.top_risk.related_route,
    });
  }

  if (copilot.top_opportunity) {
    recommendations.push({
      id: "opportunity:top",
      priority: priority++,
      title: copilot.top_opportunity.title,
      reason: copilot.top_opportunity.summary,
      category: "growth",
      relatedRoute: copilot.top_opportunity.related_route,
    });
  }

  const rankedRecommendations = rankFounderRecommendations(recommendations);

  const launchBlockers: string[] = [];
  if ((report.alerts.counts.critical ?? 0) > 0) {
    launchBlockers.push(`${report.alerts.counts.critical} critical alert(s) open`);
  }
  if (report.incidents.open.length > 0) {
    launchBlockers.push(`${report.incidents.open.length} open incident(s)`);
  }
  if (platformJobs.failed_count > 0) {
    launchBlockers.push(`${platformJobs.failed_count} failed platform job(s)`);
  }
  if (pendingReports.data > 5) {
    launchBlockers.push(`${pendingReports.data} pending moderation reports`);
  }
  for (const risk of planning.risks.slice(0, 2)) {
    if (risk.impact_score >= 70) {
      launchBlockers.push(risk.title);
    }
  }

  const warnings: string[] = [];
  if (pendingReports.partial) warnings.push("Report queue data may be incomplete.");

  return {
    generatedAt: new Date().toISOString(),
    recommendations: rankedRecommendations.slice(0, 8),
    topRisk: copilot.top_risk?.title ?? null,
    launchBlockers: [...new Set(launchBlockers)].slice(0, 6),
    partial: pendingReports.partial,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function getTopRiskRecommendation(recommendations: FounderRecommendations): FounderRecommendation | null {
  const riskItem = recommendations.recommendations.find((item) => item.category === "risk");
  if (riskItem) return riskItem;
  if (recommendations.topRisk) {
    return {
      id: "risk:top",
      priority: 1,
      title: recommendations.topRisk,
      reason: "Highest-priority risk signal from founder copilot.",
      category: "risk",
      relatedRoute: "/admin/nexus/planning",
    };
  }
  return recommendations.recommendations[0] ?? null;
}

export function getFocusRecommendations(recommendations: FounderRecommendations): FounderRecommendation[] {
  return recommendations.recommendations
    .filter((item) => ["platform", "jobs", "reports", "risk"].includes(item.category))
    .slice(0, 3);
}
