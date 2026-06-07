import type { PlanningPriority, PlanningSummary } from "@/lib/planning/types";
import type { ReportContext } from "@/lib/reports/context";
import type { DailyFocusItem } from "@/lib/copilot/types";

const URGENCY_RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;

function mapPriorityToFocus(priority: PlanningPriority): DailyFocusItem {
  return {
    id: priority.id,
    title: priority.title,
    reason: priority.summary,
    urgency: priority.urgency,
    related_route: priority.related_routes[0] ?? "/admin/nexus/overview",
  };
}

export function buildDailyFocus(
  planning: PlanningSummary,
  report: ReportContext,
): DailyFocusItem[] {
  const items: DailyFocusItem[] = planning.priorities.map(mapPriorityToFocus);

  if ((report.alerts.counts.critical ?? 0) > 0 && !items.some((item) => item.id === "priority:critical-alerts")) {
    items.unshift({
      id: "copilot:critical-alerts",
      title: "Resolve critical alerts",
      reason: `${report.alerts.counts.critical} critical alert(s) require immediate attention today.`,
      urgency: "critical",
      related_route: "/admin/nexus/alerts",
    });
  }

  for (const incident of report.incidents.open.slice(0, 2)) {
    if (items.some((item) => item.id === `priority:incident:${incident.id}`)) continue;
    items.push({
      id: `copilot:incident:${incident.id}`,
      title: incident.title,
      reason: incident.impact_summary || `Open ${incident.severity} incident needs owner review.`,
      urgency: incident.severity === "critical" ? "critical" : "high",
      related_route: "/admin/nexus/incidents",
    });
  }

  const pendingCommands =
    (report.commands.counts.suggested ?? 0) + (report.commands.counts.pending_approval ?? 0);
  if (pendingCommands > 0 && !items.some((item) => item.id === "priority:commands")) {
    items.push({
      id: "copilot:commands",
      title: "Review command recommendations",
      reason: `${pendingCommands} command recommendation(s) await owner review.`,
      urgency: "medium",
      related_route: "/admin/nexus/commands",
    });
  }

  return items
    .sort(
      (a, b) =>
        URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
        a.title.localeCompare(b.title),
    )
    .slice(0, 6);
}

export function buildRecommendedNextSteps(input: {
  daily_focus: DailyFocusItem[];
  top_risk: { recommendation: string; related_route: string } | null;
  top_opportunity: { recommendation: string; related_route: string } | null;
  planning: PlanningSummary;
}): string[] {
  const steps = new Set<string>();

  if (input.daily_focus[0]) {
    steps.add(`${input.daily_focus[0].title}: ${input.daily_focus[0].reason}`);
  }

  if (input.top_risk?.recommendation) {
    steps.add(input.top_risk.recommendation);
  }

  if (input.top_opportunity?.recommendation) {
    steps.add(input.top_opportunity.recommendation);
  }

  if (input.planning.brief.next_recommended_action) {
    steps.add(input.planning.brief.next_recommended_action);
  }

  if (input.planning.brief.secondary_focus) {
    steps.add(`Secondary focus: ${input.planning.brief.secondary_focus}`);
  }

  return [...steps].slice(0, 5);
}
