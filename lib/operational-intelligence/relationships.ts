import { METRIC_KEYS } from "@/lib/metrics/types";
import type { CorrelationsSummary } from "@/lib/correlations/types";
import type { ReportContext } from "@/lib/reports/context";
import type { RelationshipLink, TrendSnapshot } from "@/lib/operational-intelligence/types";
import {
  directionAlignment,
  relationshipStrength,
  strengthLabel,
} from "@/lib/operational-intelligence/scoring";
import { countDegradedWorkflows } from "@/lib/mission-health/degraded";

type MetricTrend = {
  current: number;
  previous: number | null;
};

function metricDirection(metric: MetricTrend | null | undefined): TrendSnapshot["direction"] {
  if (!metric || metric.previous == null) return "unknown";
  if (metric.current > metric.previous) return "up";
  if (metric.current < metric.previous) return "down";
  return "flat";
}

function buildTrendSnapshots(
  report: ReportContext,
  trends: Record<string, MetricTrend>,
): TrendSnapshot[] {
  const { metrics } = report;

  return [
    {
      label: "Meet activity",
      key: METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
      current: metrics.activity.meets_this_week,
      direction: metricDirection(trends[METRIC_KEYS.ACTIVITY_MEETS_WEEKLY]),
    },
    {
      label: "Messages",
      key: METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
      current: metrics.activity.messages_this_week,
      direction: metricDirection(trends[METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY]),
    },
    {
      label: "Posts",
      key: METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
      current: metrics.activity.posts_this_week,
      direction: metricDirection(trends[METRIC_KEYS.ACTIVITY_POSTS_WEEKLY]),
    },
    {
      label: "Blackcard",
      key: METRIC_KEYS.BLACKCARD_ACTIVE,
      current: metrics.blackcard.active_members,
      direction: metricDirection(trends[METRIC_KEYS.BLACKCARD_ACTIVE]),
    },
    {
      label: "Revenue",
      key: METRIC_KEYS.REVENUE_MRR,
      current: metrics.revenue.estimated_mrr,
      direction: metricDirection(trends[METRIC_KEYS.REVENUE_MRR]),
    },
    {
      label: "Membership signups",
      key: METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
      current: metrics.growth.new_users_this_week,
      direction: metricDirection(trends[METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY]),
    },
    {
      label: "Active profiles",
      key: METRIC_KEYS.GROWTH_ACTIVE_PROFILES,
      current: metrics.growth.active_profiles,
      direction: metricDirection(trends[METRIC_KEYS.GROWTH_ACTIVE_PROFILES]),
    },
  ];
}

function arrow(direction: TrendSnapshot["direction"]): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "flat") return "→";
  return "?";
}

function link(
  source: TrendSnapshot,
  target: TrendSnapshot,
  category: RelationshipLink["category"],
  summaryTemplate: (strength: string) => string,
): RelationshipLink {
  const { aligned, opposing, bothKnown } = directionAlignment(
    source.direction,
    target.direction,
  );
  const strength = relationshipStrength(aligned, bothKnown, opposing);

  return {
    id: `relationship:${source.key}:${target.key}`,
    source_label: `${source.label} ${arrow(source.direction)}`,
    target_label: `${target.label} ${arrow(target.direction)}`,
    source_direction: source.direction,
    target_direction: target.direction,
    strength,
    summary: summaryTemplate(strengthLabel(strength)),
    category,
  };
}

export function buildRelationshipMap(input: {
  report: ReportContext;
  trends: Record<string, MetricTrend>;
  correlations: CorrelationsSummary;
}): RelationshipLink[] {
  const snapshots = buildTrendSnapshots(input.report, input.trends);
  const byKey = new Map(snapshots.map((snapshot) => [snapshot.key, snapshot]));

  const meets = byKey.get(METRIC_KEYS.ACTIVITY_MEETS_WEEKLY)!;
  const messages = byKey.get(METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY)!;
  const posts = byKey.get(METRIC_KEYS.ACTIVITY_POSTS_WEEKLY)!;
  const blackcard = byKey.get(METRIC_KEYS.BLACKCARD_ACTIVE)!;
  const revenue = byKey.get(METRIC_KEYS.REVENUE_MRR)!;
  const signups = byKey.get(METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY)!;

  const relationships: RelationshipLink[] = [
    link(meets, messages, "engagement", (strength) =>
      `Meet activity and messaging are moving together. Relationship strength: ${strength}.`,
    ),
    link(meets, blackcard, "growth", (strength) =>
      `Meet activity and Blackcard membership show linked movement. Relationship strength: ${strength}.`,
    ),
    link(revenue, posts, "revenue", (strength) =>
      `Revenue and posting activity show ${strength.toLowerCase()} coupling — watch for engagement drag during revenue pushes.`,
    ),
    link(signups, byKey.get(METRIC_KEYS.GROWTH_ACTIVE_PROFILES)!, "growth", (strength) =>
      `Weekly signups and active profiles are co-moving. Relationship strength: ${strength}.`,
    ),
    link(posts, messages, "community", (strength) =>
      `Posts and messages indicate community loop health. Relationship strength: ${strength}.`,
    ),
  ];

  for (const correlation of input.correlations.correlations.slice(0, 4)) {
    relationships.push({
      id: `relationship:correlation:${correlation.id}`,
      source_label: correlation.signals[0]?.label ?? correlation.category,
      target_label: correlation.signals[1]?.label ?? "Related signal",
      source_direction: correlation.signals[0]?.direction ?? "unknown",
      target_direction: correlation.signals[1]?.direction ?? "unknown",
      strength:
        correlation.impact_score >= 80
          ? "high"
          : correlation.impact_score >= 60
            ? "medium"
            : "low",
      summary: correlation.summary,
      category: correlation.category as RelationshipLink["category"],
    });
  }

  const degraded = countDegradedWorkflows(input.report.mission.workflows);

  if (degraded > 0) {
    relationships.push({
      id: "relationship:workflow-revenue",
      source_label: "Workflow degradation ↓",
      target_label: "Member experience →",
      source_direction: "down",
      target_direction: "flat",
      strength: "medium",
      summary: `${degraded} degraded workflow(s) may constrain engagement and conversion loops.`,
      category: "operations",
    });
  }

  return relationships.slice(0, 10);
}

export { buildTrendSnapshots };
