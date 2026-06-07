import { METRIC_KEYS } from "@/lib/metrics/types";
import { clampScore, degradedWorkflowCount, direction, trend } from "@/lib/planning/goals";
import type {
  PlanningContext,
  PlanningHorizon,
  PlanningObjective,
} from "@/lib/planning/types";

function objective(
  input: Omit<PlanningObjective, "horizon"> & { horizon: PlanningHorizon },
): PlanningObjective {
  return {
    ...input,
    confidence_score: clampScore(input.confidence_score),
    impact_score: clampScore(input.impact_score),
  };
}

export function buildWeeklyObjectives(context: PlanningContext): PlanningObjective[] {
  const items: PlanningObjective[] = [];

  const engagementUp = [
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ].filter((key) => direction(trend(context, key)) === "up").length;

  const engagementFlatOrDown = [
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ].every((key) => {
    const dir = direction(trend(context, key));
    return dir === "flat" || dir === "down" || dir === "unknown";
  });

  if (engagementFlatOrDown || engagementUp < 2) {
    items.push(
      objective({
        id: "weekly:increase-engagement",
        horizon: "weekly",
        category: "engagement",
        title: "Increase community engagement",
        summary:
          "Posts, meets, and messages are not rising together. Focus the week on activation loops and visible community momentum.",
        confidence_score: 82,
        impact_score: 74,
        recommendation: "Review Metrics and Observations for the weakest engagement channel this week.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/observations"],
        on_track: false,
      }),
    );
  }

  const blackcardMembers = context.metrics.blackcard.active_members;
  const conversionAvailable = context.metrics.blackcard.conversion_estimate_available;
  if ((blackcardMembers ?? 0) < 10 || conversionAvailable === false) {
    items.push(
      objective({
        id: "weekly:blackcard-conversions",
        horizon: "weekly",
        category: "revenue",
        title: "Improve Blackcard conversions",
        summary:
          "Blackcard membership or conversion signals suggest room to strengthen monetization this week.",
        confidence_score: 76,
        impact_score: 80,
        recommendation: "Inspect Blackcard metrics and Intelligence opportunity signals.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/intelligence"],
        on_track: null,
      }),
    );
  }

  const meetsTrend = direction(trend(context, METRIC_KEYS.ACTIVITY_MEETS_WEEKLY));
  if (meetsTrend === "up" || (context.metrics.activity.meets_this_week ?? 0) > 0) {
    items.push(
      objective({
        id: "weekly:promote-meets",
        horizon: "weekly",
        category: "community",
        title: "Promote upcoming meets",
        summary:
          "Meet activity is present or rising. Use the week to amplify meet visibility and attendance.",
        confidence_score: 78,
        impact_score: 68,
        recommendation: "Highlight active meet momentum in community channels and owner briefings.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/briefings"],
        on_track: meetsTrend === "up",
      }),
    );
  }

  if (degradedWorkflowCount(context) > 0) {
    items.push(
      objective({
        id: "weekly:workflow-degradation",
        horizon: "weekly",
        category: "operations",
        title: "Review workflow degradation",
        summary: `${degradedWorkflowCount(context)} user workflow(s) are degraded and need owner review this week.`,
        confidence_score: 90,
        impact_score: 88,
        recommendation: "Open Workflows and resolve degraded paths before growth initiatives expand.",
        related_routes: ["/admin/nexus/mission-health", "/admin/nexus/alerts"],
        on_track: false,
      }),
    );
  }

  if (context.incidents.open.length > 0) {
    items.push(
      objective({
        id: "weekly:resolve-incidents",
        horizon: "weekly",
        category: "risk",
        title: "Resolve open incidents",
        summary: `${context.incidents.open.length} open incident(s) should be triaged before other weekly planning work.`,
        confidence_score: 92,
        impact_score: 94,
        recommendation: "Open Incidents and confirm mitigation ownership for the week.",
        related_routes: ["/admin/nexus/incidents", "/admin/nexus/war-rooms"],
        on_track: false,
      }),
    );
  }

  for (const correlation of context.correlations.correlations.slice(0, 2)) {
    if (correlation.category === "engagement" || correlation.category === "community") {
      items.push(
        objective({
          id: `weekly:correlation:${correlation.id}`,
          horizon: "weekly",
          category: "engagement",
          title: correlation.title,
          summary: correlation.summary,
          confidence_score: correlation.confidence_score,
          impact_score: correlation.impact_score,
          recommendation: correlation.recommendation,
          related_routes: correlation.related_routes,
          on_track: true,
        }),
      );
    }
  }

  return items.slice(0, 6);
}

export function buildMonthlyObjectives(context: PlanningContext): PlanningObjective[] {
  const items: PlanningObjective[] = [];

  const monthlyGrowth = direction(trend(context, METRIC_KEYS.GROWTH_SIGNUPS_MONTHLY));
  const weeklyGrowth = direction(trend(context, METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY));

  if (monthlyGrowth !== "up" || weeklyGrowth === "down") {
    items.push(
      objective({
        id: "monthly:grow-members",
        horizon: "monthly",
        category: "growth",
        title: "Grow member count",
        summary:
          "Monthly or weekly signup momentum is not clearly accelerating. Make member growth a monthly planning priority.",
        confidence_score: 80,
        impact_score: 82,
        recommendation: "Use Reports and Briefings to review acquisition channels and onboarding quality.",
        related_routes: ["/admin/nexus/reports", "/admin/nexus/briefings", "/admin/nexus/metrics"],
        on_track: monthlyGrowth === "up",
      }),
    );
  }

  const blackcardDir = direction(trend(context, METRIC_KEYS.BLACKCARD_ACTIVE));
  if (blackcardDir !== "up") {
    items.push(
      objective({
        id: "monthly:blackcard-memberships",
        horizon: "monthly",
        category: "revenue",
        title: "Increase Blackcard memberships",
        summary:
          "Blackcard membership is not clearly rising. Treat membership expansion as a monthly revenue objective.",
        confidence_score: 78,
        impact_score: 86,
        recommendation: "Review revenue intelligence and Blackcard metrics for conversion friction.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/intelligence", "/admin/nexus/reports"],
        on_track: false,
      }),
    );
  }

  const meetsDir = direction(trend(context, METRIC_KEYS.ACTIVITY_MEETS_WEEKLY));
  if (meetsDir !== "up") {
    items.push(
      objective({
        id: "monthly:meet-participation",
        horizon: "monthly",
        category: "community",
        title: "Improve meet participation",
        summary:
          "Meet activity is flat or declining. Strengthen meet cadence and participation as a monthly community objective.",
        confidence_score: 77,
        impact_score: 72,
        recommendation: "Inspect meet trends in Metrics and community observations.",
        related_routes: ["/admin/nexus/metrics", "/admin/nexus/observations"],
        on_track: false,
      }),
    );
  }

  const retentionRisk =
    direction(trend(context, METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY)) === "down" ||
    direction(trend(context, METRIC_KEYS.ACTIVITY_POSTS_WEEKLY)) === "down";

  if (retentionRisk) {
    items.push(
      objective({
        id: "monthly:retention",
        horizon: "monthly",
        category: "engagement",
        title: "Strengthen community retention",
        summary:
          "Core engagement channels are not holding momentum. Prioritize retention before scaling acquisition.",
        confidence_score: 81,
        impact_score: 79,
        recommendation: "Review Correlations and Memory for recent engagement shifts.",
        related_routes: ["/admin/nexus/correlations", "/admin/nexus/memory", "/admin/nexus/briefings"],
        on_track: false,
      }),
    );
  }

  if (context.monthly_briefing_headline) {
    items.push(
      objective({
        id: "monthly:briefing-focus",
        horizon: "monthly",
        category: "operations",
        title: "Execute monthly briefing focus",
        summary: context.monthly_briefing_headline,
        confidence_score: 74,
        impact_score: 70,
        recommendation: "Open Briefings and align monthly owner actions to the generated focus areas.",
        related_routes: ["/admin/nexus/briefings", "/admin/nexus/reports"],
        on_track: null,
      }),
    );
  }

  return items.slice(0, 6);
}
