import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusCopilot } from "@/lib/copilot/engine";
import { getFounderRecommendations } from "@/lib/founder-copilot/recommendations";
import { buildFounderPriorities } from "@/lib/nexus/founder-derive";
import { loadReportContext } from "@/lib/reports/context";
import { computeLaunchReadiness } from "@/lib/proactive-intelligence/launch-readiness";
import type {
  FounderPriorityEngine,
  FounderPriorityItem,
  ProactiveAlert,
} from "@/lib/proactive-intelligence/types";

const URGENCY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function alertToPriority(alert: ProactiveAlert, rank: number): FounderPriorityItem {
  return {
    id: alert.id,
    rank,
    type: "issue",
    title: alert.title,
    reason: alert.summary,
    urgency: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "high" : "medium",
    relatedRoute: alert.relatedRoute,
  };
}

export async function buildFounderPriorityEngine(
  admin: SupabaseClient,
  proactiveAlerts: ProactiveAlert[],
): Promise<FounderPriorityEngine> {
  const [report, recommendations, copilot, launchReadiness] = await Promise.all([
    loadReportContext(admin),
    getFounderRecommendations(admin),
    getNexusCopilot(admin),
    computeLaunchReadiness(admin),
  ]);

  const derivedPriorities = buildFounderPriorities({
    alerts: report.alerts.active ?? [],
    incidents: report.incidents.open,
    observations: report.observations.active ?? [],
    commands: report.commands.commands ?? [],
  });

  const rankedItems: FounderPriorityItem[] = [];
  let rank = 1;

  for (const alert of proactiveAlerts.slice(0, 4)) {
    rankedItems.push(alertToPriority(alert, rank++));
  }

  for (const item of derivedPriorities.slice(0, 4)) {
    rankedItems.push({
      id: item.id,
      rank: rank++,
      type: "issue",
      title: item.title,
      reason: item.reason,
      urgency: item.urgency,
      relatedRoute: item.href,
    });
  }

  for (const rec of recommendations.recommendations.slice(0, 4)) {
    rankedItems.push({
      id: rec.id,
      rank: rank++,
      type: rec.category === "growth" ? "opportunity" : "action",
      title: rec.title,
      reason: rec.reason,
      urgency:
        rec.category === "risk" || rec.category === "platform"
          ? "high"
          : rec.category === "jobs" || rec.category === "reports"
            ? "medium"
            : "low",
      relatedRoute: rec.relatedRoute,
    });
  }

  if (copilot.top_opportunity) {
    rankedItems.push({
      id: "copilot:opportunity",
      rank: rank++,
      type: "opportunity",
      title: copilot.top_opportunity.title,
      reason: copilot.top_opportunity.summary,
      urgency: "medium",
      relatedRoute: copilot.top_opportunity.related_route,
    });
  }

  const deduped = new Map<string, FounderPriorityItem>();
  for (const item of rankedItems) {
    if (!deduped.has(item.title)) {
      deduped.set(item.title, item);
    }
  }

  const sorted = [...deduped.values()]
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.rank - b.rank)
    .map((item, index) => ({ ...item, rank: index + 1 }))
    .slice(0, 10);

  const issues = sorted.filter((item) => item.type === "issue");
  const opportunities = sorted.filter((item) => item.type === "opportunity");
  const actions = sorted.filter((item) => item.type === "action");

  const highestPriorityIssue = issues[0] ?? null;
  const highestOpportunity =
    opportunities[0] ??
    (copilot.top_opportunity
      ? {
          id: "copilot:opportunity",
          rank: 1,
          type: "opportunity" as const,
          title: copilot.top_opportunity.title,
          reason: copilot.top_opportunity.summary,
          urgency: "medium" as const,
          relatedRoute: copilot.top_opportunity.related_route,
        }
      : null);

  const recommendedNextAction =
    actions[0] ??
    sorted.find((item) => item.type === "action") ??
    (recommendations.recommendations[0]
      ? {
          id: recommendations.recommendations[0].id,
          rank: 1,
          type: "action" as const,
          title: recommendations.recommendations[0].title,
          reason: recommendations.recommendations[0].reason,
          urgency: "medium" as const,
          relatedRoute: recommendations.recommendations[0].relatedRoute,
        }
      : highestPriorityIssue);

  return {
    generatedAt: new Date().toISOString(),
    highestPriorityIssue,
    highestOpportunity,
    recommendedNextAction,
    estimatedLaunchReadiness: launchReadiness,
    rankedItems: sorted,
  };
}
