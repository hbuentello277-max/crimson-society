import { clampScore, degradedWorkflowCount, direction, trend } from "@/lib/planning/goals";
import { METRIC_KEYS } from "@/lib/metrics/types";
import type {
  FounderPlanningBrief,
  PlanningContext,
  PlanningOpportunity,
  PlanningPriority,
  PlanningRisk,
  PlanningUrgency,
} from "@/lib/planning/types";

function risk(
  input: Omit<PlanningRisk, "confidence_score" | "impact_score"> & {
    confidence_score: number;
    impact_score: number;
  },
): PlanningRisk {
  return {
    ...input,
    confidence_score: clampScore(input.confidence_score),
    impact_score: clampScore(input.impact_score),
  };
}

function opportunity(
  input: Omit<PlanningOpportunity, "confidence_score" | "impact_score"> & {
    confidence_score: number;
    impact_score: number;
  },
): PlanningOpportunity {
  return {
    ...input,
    confidence_score: clampScore(input.confidence_score),
    impact_score: clampScore(input.impact_score),
  };
}

export function buildPlanningRisks(context: PlanningContext): PlanningRisk[] {
  const items: PlanningRisk[] = [];

  if (degradedWorkflowCount(context) > 0) {
    items.push(
      risk({
        id: "risk:workflow-degradation",
        category: "operations",
        title: "Workflow degradation",
        summary: `${degradedWorkflowCount(context)} workflow(s) are degraded and may affect member experience.`,
        confidence_score: 90,
        impact_score: 90,
        recommendation: "Inspect Workflows and linked alerts before planning growth initiatives.",
        related_routes: ["/admin/nexus/mission-health", "/admin/nexus/alerts"],
      }),
    );
  }

  const engagementDown = [
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ].filter((key) => direction(trend(context, key)) === "down").length;

  if (engagementDown >= 2) {
    items.push(
      risk({
        id: "risk:declining-engagement",
        category: "engagement",
        title: "Declining engagement",
        summary: "Multiple community engagement channels are trending downward together.",
        confidence_score: 84,
        impact_score: 82,
        recommendation: "Review Metrics and Observations to identify the weakest engagement loop.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/observations"],
      }),
    );
  }

  if (direction(trend(context, METRIC_KEYS.REVENUE_MRR)) === "down") {
    items.push(
      risk({
        id: "risk:revenue-stagnation",
        category: "revenue",
        title: "Revenue stagnation",
        summary: "Estimated MRR is trending downward or failing to advance.",
        confidence_score: 82,
        impact_score: 88,
        recommendation: "Review revenue metrics, reports, and Blackcard conversion signals.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/reports"],
      }),
    );
  }

  if (context.incidents.open.length > 0) {
    items.push(
      risk({
        id: "risk:open-incidents",
        category: "risk",
        title: "Open incidents",
        summary: `${context.incidents.open.length} incident(s) remain open and may block strategic progress.`,
        confidence_score: 93,
        impact_score: 95,
        recommendation: "Resolve or assign open incidents before shifting to growth planning.",
        related_routes: ["/admin/nexus/incidents", "/admin/nexus/war-rooms"],
      }),
    );
  }

  for (const item of context.intelligence.items.filter((row) => row.category === "risk").slice(0, 3)) {
    items.push(
      risk({
        id: `risk:intelligence:${item.id}`,
        category: "risk",
        title: item.title,
        summary: item.summary,
        confidence_score: item.confidence_score,
        impact_score: item.impact_score,
        recommendation: item.recommendation,
        related_routes: ["/admin/nexus/intelligence", "/admin/nexus/observations"],
      }),
    );
  }

  for (const item of context.correlations.correlations.filter((row) =>
    ["risk", "platform_health", "operations"].includes(row.category),
  ).slice(0, 2)) {
    items.push(
      risk({
        id: `risk:correlation:${item.id}`,
        category: "operations",
        title: item.title,
        summary: item.summary,
        confidence_score: item.confidence_score,
        impact_score: item.impact_score,
        recommendation: item.recommendation,
        related_routes: item.related_routes,
      }),
    );
  }

  return items.slice(0, 8);
}

export function buildPlanningOpportunities(context: PlanningContext): PlanningOpportunity[] {
  const items: PlanningOpportunity[] = [];

  const engagementUp = [
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ].filter((key) => direction(trend(context, key)) === "up").length;

  if (engagementUp >= 2) {
    items.push(
      opportunity({
        id: "opportunity:high-engagement",
        category: "engagement",
        title: "High engagement trend",
        summary: "Community engagement signals are rising together and may support acquisition or retention wins.",
        confidence_score: 83,
        impact_score: 76,
        recommendation: "Double down on the channels showing the strongest weekly lift.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/correlations"],
      }),
    );
  }

  if (direction(trend(context, METRIC_KEYS.ACTIVITY_MEETS_WEEKLY)) === "up") {
    items.push(
      opportunity({
        id: "opportunity:meet-activity",
        category: "community",
        title: "Growing meet activity",
        summary: "Meet participation is trending upward and can anchor community momentum.",
        confidence_score: 80,
        impact_score: 72,
        recommendation: "Promote meet cadence while activity is rising.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/briefings"],
      }),
    );
  }

  if (direction(trend(context, METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY)) === "up") {
    items.push(
      opportunity({
        id: "opportunity:messaging-growth",
        category: "community",
        title: "Strong messaging growth",
        summary: "Message volume is rising, indicating active member-to-member connection.",
        confidence_score: 79,
        impact_score: 70,
        recommendation: "Protect messaging reliability and highlight community activity.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/observations"],
      }),
    );
  }

  if (
    direction(trend(context, METRIC_KEYS.BLACKCARD_ACTIVE)) === "up" ||
    direction(trend(context, METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY)) === "up"
  ) {
    items.push(
      opportunity({
        id: "opportunity:blackcard-growth",
        category: "revenue",
        title: "Blackcard growth potential",
        summary: "Membership or signup momentum creates room for Blackcard expansion.",
        confidence_score: 77,
        impact_score: 84,
        recommendation: "Review Intelligence and Reports for monetization opportunities while momentum exists.",
        related_routes: ["/admin/nexus/intelligence", "/admin/nexus/reports"],
      }),
    );
  }

  for (const item of context.intelligence.items.filter((row) => row.category === "opportunity").slice(0, 4)) {
    items.push(
      opportunity({
        id: `opportunity:intelligence:${item.id}`,
        category: "growth",
        title: item.title,
        summary: item.summary,
        confidence_score: item.confidence_score,
        impact_score: item.impact_score,
        recommendation: item.recommendation,
        related_routes: ["/admin/nexus/intelligence", "/admin/nexus/reports"],
      }),
    );
  }

  for (const item of context.correlations.correlations.filter((row) =>
    ["growth", "community", "engagement", "blackcard", "revenue"].includes(row.category),
  ).slice(0, 2)) {
    items.push(
      opportunity({
        id: `opportunity:correlation:${item.id}`,
        category: item.category === "blackcard" ? "revenue" : "community",
        title: item.title,
        summary: item.summary,
        confidence_score: item.confidence_score,
        impact_score: item.impact_score,
        recommendation: item.recommendation,
        related_routes: item.related_routes,
      }),
    );
  }

  return items.slice(0, 8);
}

function urgencyRank(urgency: PlanningUrgency) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[urgency];
}

export function buildPlanningPriorities(
  context: PlanningContext,
  risks: PlanningRisk[],
  opportunities: PlanningOpportunity[],
): PlanningPriority[] {
  const items: PlanningPriority[] = [];

  if ((context.alerts.counts.critical ?? 0) > 0) {
    items.push({
      id: "priority:critical-alerts",
      title: "Resolve critical alerts",
      summary: `${context.alerts.counts.critical} critical alert(s) require immediate owner attention.`,
      category: "risk",
      urgency: "critical",
      confidence_score: 95,
      impact_score: 96,
      recommendation: "Open Alerts and clear critical items before strategic planning work.",
      related_routes: ["/admin/nexus/alerts"],
    });
  }

  for (const incident of context.incidents.open.slice(0, 2)) {
    items.push({
      id: `priority:incident:${incident.id}`,
      title: incident.title,
      summary: incident.impact_summary || `Open incident with ${incident.severity} severity.`,
      category: "risk",
      urgency: incident.severity === "critical" ? "critical" : "high",
      confidence_score: 90,
      impact_score: Math.min(100, 70 + incident.impact_score / 3),
      recommendation: "Review incident context and assign next mitigation step.",
      related_routes: ["/admin/nexus/incidents"],
    });
  }

  for (const riskItem of risks.slice(0, 3)) {
    items.push({
      id: `priority:${riskItem.id}`,
      title: riskItem.title,
      summary: riskItem.summary,
      category: riskItem.category,
      urgency: riskItem.impact_score >= 90 ? "high" : "medium",
      confidence_score: riskItem.confidence_score,
      impact_score: riskItem.impact_score,
      recommendation: riskItem.recommendation,
      related_routes: riskItem.related_routes,
    });
  }

  for (const observation of context.observations.active.slice(0, 2)) {
    items.push({
      id: `priority:observation:${observation.id}`,
      title: observation.title,
      summary: observation.summary,
      category: "operations",
      urgency: observation.severity === "critical" ? "high" : "medium",
      confidence_score: 78,
      impact_score: observation.priority_score ?? 70,
      recommendation: "Review insight details and confirm whether action is needed.",
      related_routes: ["/admin/nexus/observations"],
    });
  }

  for (const opportunityItem of opportunities.slice(0, 2)) {
    items.push({
      id: `priority:${opportunityItem.id}`,
      title: opportunityItem.title,
      summary: opportunityItem.summary,
      category: opportunityItem.category,
      urgency: "medium",
      confidence_score: opportunityItem.confidence_score,
      impact_score: opportunityItem.impact_score,
      recommendation: opportunityItem.recommendation,
      related_routes: opportunityItem.related_routes,
    });
  }

  const pendingCommands =
    (context.commands.counts.suggested ?? 0) + (context.commands.counts.pending_approval ?? 0);
  if (pendingCommands > 0) {
    items.push({
      id: "priority:commands",
      title: "Review pending command recommendations",
      summary: `${pendingCommands} command recommendation(s) await owner review.`,
      category: "operations",
      urgency: "low",
      confidence_score: 72,
      impact_score: 62,
      recommendation: "Open Commands and review recommendations without executing automation.",
      related_routes: ["/admin/nexus/commands"],
    });
  }

  return items
    .sort(
      (a, b) =>
        urgencyRank(a.urgency) - urgencyRank(b.urgency) ||
        b.impact_score - a.impact_score ||
        b.confidence_score - a.confidence_score,
    )
    .slice(0, 12);
}

export function buildFounderPlanningBrief(
  context: PlanningContext,
  risks: PlanningRisk[],
  opportunities: PlanningOpportunity[],
  priorities: PlanningPriority[],
): FounderPlanningBrief {
  const topRisk = risks.sort((a, b) => b.impact_score - a.impact_score)[0];
  const topOpportunity = opportunities.sort((a, b) => b.impact_score - a.impact_score)[0];
  const primary = priorities[0];
  const secondary = priorities[1];

  let overall_direction = "Maintain steady execution while monitoring platform signals.";
  if ((context.alerts.counts.critical ?? 0) > 0 || context.incidents.open.length > 0) {
    overall_direction = "Stabilize operations before expanding strategic initiatives.";
  } else if (opportunities.length > risks.length) {
    overall_direction = "Capitalize on supported growth and engagement opportunities this cycle.";
  } else if (degradedWorkflowCount(context) > 0) {
    overall_direction = "Restore workflow reliability while protecting current community momentum.";
  }

  return {
    overall_direction,
    biggest_opportunity:
      topOpportunity?.title ?? "No supported opportunity pattern detected from current Nexus data.",
    biggest_risk: topRisk?.title ?? "No major active risk pattern detected from current Nexus data.",
    primary_focus: primary?.title ?? "Review weekly metrics and briefing focus areas.",
    secondary_focus: secondary?.title ?? "Monitor correlations and memory for emerging shifts.",
    next_recommended_action:
      primary?.recommendation ??
      topOpportunity?.recommendation ??
      "Open Reports and Briefings to confirm the current planning cycle.",
  };
}
