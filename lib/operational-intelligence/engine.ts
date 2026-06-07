import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusCopilot } from "@/lib/copilot/engine";
import { getNexusCorrelations } from "@/lib/correlations/summary";
import { getNexusForecasting } from "@/lib/forecasting/engine";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import {
  loadMetricSnapshotTrends,
  OPERATIONAL_INTELLIGENCE_TREND_KEYS,
} from "@/lib/metrics/trends";
import { METRIC_KEYS } from "@/lib/metrics/types";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { runCached } from "@/lib/nexus/request-cache";
import { buildRepeatingPatterns } from "@/lib/operational-intelligence/patterns";
import { buildRelationshipMap, buildTrendSnapshots } from "@/lib/operational-intelligence/relationships";
import {
  clampScore,
  combinedRankingScore,
  influenceScore,
  severityFromSignals,
} from "@/lib/operational-intelligence/scoring";
import type {
  InfluenceRankingItem,
  OperationalDragItem,
  OperationalDriver,
  OperationalIntelligenceCategory,
  OperationalIntelligenceItem,
  OperationalIntelligenceSummary,
  TrendSnapshot,
} from "@/lib/operational-intelligence/types";
import { getNexusPlanning } from "@/lib/planning/engine";
import { getExecutiveReportSummary } from "@/lib/reports/summary";
import { loadReportContext } from "@/lib/reports/context";

function snapshotInfluence(snapshot: TrendSnapshot, domain: InfluenceRankingItem["domain"]) {
  const direction =
    snapshot.direction === "up"
      ? "positive"
      : snapshot.direction === "down"
        ? "negative"
        : "mixed";

  const growthKeys = new Set<string>([
    METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
    METRIC_KEYS.GROWTH_ACTIVE_PROFILES,
    METRIC_KEYS.BLACKCARD_ACTIVE,
  ]);
  const engagementKeys = new Set<string>([
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ]);

  const domainFit =
    (domain === "growth" && growthKeys.has(snapshot.key)) ||
    (domain === "revenue" && snapshot.key === METRIC_KEYS.REVENUE_MRR) ||
    (domain === "engagement" && engagementKeys.has(snapshot.key)) ||
    (domain === "community_health" && snapshot.key === METRIC_KEYS.ACTIVITY_POSTS_WEEKLY) ||
    (domain === "operational_stability" && snapshot.key === METRIC_KEYS.ACTIVITY_MEETS_WEEKLY);

  if (!domainFit) return null;

  const alignment = snapshot.direction === "up" ? 85 : snapshot.direction === "down" ? 70 : 40;
  const score = influenceScore({
    impact: snapshot.direction === "unknown" ? 35 : 75,
    confidence: snapshot.direction === "unknown" ? 30 : 80,
    alignment,
  });

  return {
    id: `influence:${domain}:${snapshot.key}`,
    domain,
    signal: snapshot.label,
    influence_score: score,
    confidence_score: snapshot.direction === "unknown" ? 35 : 78,
    direction: direction as InfluenceRankingItem["direction"],
    summary: `${snapshot.label} is trending ${snapshot.direction} and influencing ${domain.replaceAll("_", " ")}.`,
  } satisfies InfluenceRankingItem;
}

function buildInfluenceRankings(
  snapshots: TrendSnapshot[],
  report: Awaited<ReturnType<typeof loadReportContext>>,
): InfluenceRankingItem[] {
  const domains: InfluenceRankingItem["domain"][] = [
    "growth",
    "revenue",
    "engagement",
    "community_health",
    "operational_stability",
  ];

  const items: InfluenceRankingItem[] = [];

  for (const domain of domains) {
    for (const snapshot of snapshots) {
      const ranked = snapshotInfluence(snapshot, domain);
      if (ranked) items.push(ranked);
    }
  }

  if ((report.alerts.counts.critical ?? 0) > 0) {
    items.push({
      id: "influence:stability:critical-alerts",
      domain: "operational_stability",
      signal: "Critical alerts",
      influence_score: 92,
      confidence_score: 95,
      direction: "negative",
      summary: "Critical alerts are strongly influencing operational stability.",
    });
  }

  return items
    .sort((a, b) => b.influence_score - a.influence_score)
    .slice(0, 12);
}

function buildDrivers(
  snapshots: TrendSnapshot[],
  planning: Awaited<ReturnType<typeof getNexusPlanning>>,
): OperationalDriver[] {
  const drivers: OperationalDriver[] = [];

  const driverMap: Array<{ key: string; label: string; category: OperationalIntelligenceCategory }> = [
    { key: METRIC_KEYS.ACTIVITY_MEETS_WEEKLY, label: "Meet creation", category: "engagement" },
    { key: METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY, label: "User onboarding", category: "growth" },
    { key: METRIC_KEYS.BLACKCARD_ACTIVE, label: "Blackcard adoption", category: "revenue" },
    { key: METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY, label: "Messaging activity", category: "community" },
    { key: METRIC_KEYS.ACTIVITY_POSTS_WEEKLY, label: "Community engagement", category: "engagement" },
  ];

  for (const spec of driverMap) {
    const snapshot = snapshots.find((row) => row.key === spec.key);
    if (!snapshot || snapshot.direction !== "up") continue;

    drivers.push({
      id: `driver:${spec.key}`,
      label: spec.label,
      summary: `${spec.label} is trending upward and contributing to ${spec.category} momentum.`,
      influence_score: influenceScore({ impact: 80, confidence: 78, alignment: 85 }),
      category: spec.category,
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/reports"],
    });
  }

  for (const opportunity of planning.opportunities.slice(0, 2)) {
    drivers.push({
      id: `driver:${opportunity.id}`,
      label: opportunity.title,
      summary: opportunity.summary,
      influence_score: clampScore(opportunity.impact_score * 0.7 + opportunity.confidence_score * 0.3),
      category: opportunity.category as OperationalIntelligenceCategory,
      related_routes: opportunity.related_routes,
    });
  }

  return drivers.sort((a, b) => b.influence_score - a.influence_score).slice(0, 8);
}

function buildDrag(
  report: Awaited<ReturnType<typeof loadReportContext>>,
  snapshots: TrendSnapshot[],
  planning: Awaited<ReturnType<typeof getNexusPlanning>>,
): OperationalDragItem[] {
  const drag: OperationalDragItem[] = [];

  for (const snapshot of snapshots.filter((row) => row.direction === "down")) {
    drag.push({
      id: `drag:${snapshot.key}`,
      label: `${snapshot.label} slowdown`,
      summary: `${snapshot.label} is trending downward and may be dragging community outcomes.`,
      severity_score: severityFromSignals({ impact: 75, recurrence: 50, confidence: 70 }),
      category:
        snapshot.key.includes("revenue") || snapshot.key.includes("blackcard")
          ? "revenue"
          : snapshot.key.includes("activity")
            ? "engagement"
            : "growth",
      related_routes: ["/admin/nexus/metrics"],
    });
  }

  const degraded = (report.mission.workflows ?? []).filter((workflow) =>
    ["degraded", "impaired", "critical", "failing"].includes(
      workflow.workflow_status.toLowerCase(),
    ),
  ).length;

  if (degraded > 0) {
    drag.push({
      id: "drag:workflow-degradation",
      label: "Workflow degradation",
      summary: `${degraded} workflow(s) degraded — may hurt engagement and conversion loops.`,
      severity_score: severityFromSignals({ impact: 88, recurrence: 60, confidence: 85 }),
      category: "operations",
      related_routes: ["/admin/nexus/mission-health"],
    });
  }

  for (const risk of planning.risks.slice(0, 3)) {
    drag.push({
      id: `drag:${risk.id}`,
      label: risk.title,
      summary: risk.summary,
      severity_score: severityFromSignals({
        impact: risk.impact_score,
        recurrence: 55,
        confidence: risk.confidence_score,
      }),
      category: risk.category as OperationalIntelligenceCategory,
      related_routes: risk.related_routes,
    });
  }

  if (report.incidents.open.length > 0) {
    drag.push({
      id: "drag:open-incidents",
      label: "Incident recurrence",
      summary: `${report.incidents.open.length} open incident(s) are adding operational drag.`,
      severity_score: severityFromSignals({ impact: 90, recurrence: 70, confidence: 88 }),
      category: "risk",
      related_routes: ["/admin/nexus/incidents"],
    });
  }

  const lowPosts = snapshots.find((row) => row.key === METRIC_KEYS.ACTIVITY_POSTS_WEEKLY);
  if (lowPosts && (lowPosts.current ?? 0) === 0 && lowPosts.direction !== "up") {
    drag.push({
      id: "drag:low-posting",
      label: "Low posting activity",
      summary: "Posting activity is flat or absent, weakening community visibility loops.",
      severity_score: severityFromSignals({ impact: 65, recurrence: 45, confidence: 72 }),
      category: "engagement",
      related_routes: ["/admin/nexus/metrics", "/admin/nexus/observations"],
    });
  }

  return drag.sort((a, b) => b.severity_score - a.severity_score).slice(0, 8);
}

function buildRecommendations(input: {
  drivers: OperationalDriver[];
  drag: OperationalDragItem[];
  planning: Awaited<ReturnType<typeof getNexusPlanning>>;
  intelligence: Awaited<ReturnType<typeof getNexusIntelligence>>;
  copilot: Awaited<ReturnType<typeof getNexusCopilot>>;
}): OperationalIntelligenceItem[] {
  const items: OperationalIntelligenceItem[] = [];

  for (const driver of input.drivers.slice(0, 3)) {
    items.push({
      id: `recommendation:driver:${driver.id}`,
      category: driver.category,
      title: `Protect ${driver.label}`,
      summary: driver.summary,
      evidence: { driver_id: driver.id, influence_score: driver.influence_score },
      influence_score: driver.influence_score,
      confidence_score: 78,
      impact_score: driver.influence_score,
      recommendation: `Review metrics and reports to reinforce ${driver.label.toLowerCase()} while momentum is positive.`,
      related_routes: driver.related_routes,
    });
  }

  for (const dragItem of input.drag.slice(0, 3)) {
    items.push({
      id: `recommendation:drag:${dragItem.id}`,
      category: dragItem.category,
      title: `Address ${dragItem.label}`,
      summary: dragItem.summary,
      evidence: { drag_id: dragItem.id, severity_score: dragItem.severity_score },
      influence_score: dragItem.severity_score,
      confidence_score: 80,
      impact_score: dragItem.severity_score,
      recommendation: `Inspect linked Nexus routes and confirm whether ${dragItem.label.toLowerCase()} needs owner attention today.`,
      related_routes: dragItem.related_routes,
    });
  }

  for (const item of input.intelligence.items.slice(0, 3)) {
    items.push({
      id: `recommendation:intelligence:${item.id}`,
      category: (item.category === "opportunity" ? "growth" : item.category) as OperationalIntelligenceCategory,
      title: item.title,
      summary: item.summary,
      evidence: { intelligence_id: item.id },
      influence_score: combinedRankingScore({
        influence_score: item.impact_score,
        impact_score: item.impact_score,
        confidence_score: item.confidence_score,
      }),
      confidence_score: item.confidence_score,
      impact_score: item.impact_score,
      recommendation: item.recommendation,
      related_routes: ["/admin/nexus/intelligence"],
    });
  }

  if (input.copilot.top_opportunity) {
    items.push({
      id: "recommendation:copilot-opportunity",
      category: "growth",
      title: input.copilot.top_opportunity.title,
      summary: input.copilot.top_opportunity.summary,
      evidence: { source: "copilot" },
      influence_score: combinedRankingScore({
        influence_score: input.copilot.top_opportunity.impact_score,
        impact_score: input.copilot.top_opportunity.impact_score,
        confidence_score: input.copilot.top_opportunity.confidence_score,
      }),
      confidence_score: input.copilot.top_opportunity.confidence_score,
      impact_score: input.copilot.top_opportunity.impact_score,
      recommendation: input.copilot.top_opportunity.recommendation,
      related_routes: [input.copilot.top_opportunity.related_route, "/admin/nexus/copilot"],
    });
  }

  for (const priority of input.planning.priorities.slice(0, 2)) {
    items.push({
      id: `recommendation:planning:${priority.id}`,
      category: priority.category as OperationalIntelligenceCategory,
      title: priority.title,
      summary: priority.summary,
      evidence: { planning_id: priority.id, urgency: priority.urgency },
      influence_score: combinedRankingScore({
        influence_score: priority.impact_score,
        impact_score: priority.impact_score,
        confidence_score: priority.confidence_score,
      }),
      confidence_score: priority.confidence_score,
      impact_score: priority.impact_score,
      recommendation: priority.recommendation,
      related_routes: priority.related_routes,
    });
  }

  return items
    .sort((a, b) => {
      const scoreA = combinedRankingScore({
        influence_score: a.influence_score,
        impact_score: a.impact_score,
        confidence_score: a.confidence_score,
      });
      const scoreB = combinedRankingScore({
        influence_score: b.influence_score,
        impact_score: b.impact_score,
        confidence_score: b.confidence_score,
      });
      return scoreB - scoreA || b.impact_score - a.impact_score;
    })
    .slice(0, 10);
}

export function getNexusOperationalIntelligence(
  supabase: SupabaseClient,
): Promise<OperationalIntelligenceSummary> {
  return runCached(supabase, "nexus:operational-intelligence", () =>
    getNexusOperationalIntelligenceImpl(supabase),
  );
}

async function getNexusOperationalIntelligenceImpl(
  supabase: SupabaseClient,
): Promise<OperationalIntelligenceSummary> {
  const generated_at = new Date().toISOString();

  const [
    report,
    trends,
    correlations,
    intelligence,
    memory,
    planning,
    forecasting,
    copilot,
    executiveReport,
  ] = await Promise.all([
    loadReportContext(supabase),
    loadMetricSnapshotTrends(supabase, OPERATIONAL_INTELLIGENCE_TREND_KEYS),
    getNexusCorrelations(supabase, { window: "30d", sort: "impact" }),
    getNexusIntelligence(supabase, { sort: "impact" }),
    getNexusMemorySummary(supabase, { limit: 50 }),
    getNexusPlanning(supabase),
    getNexusForecasting(supabase),
    getNexusCopilot(supabase),
    getExecutiveReportSummary(supabase),
  ]);

  void forecasting;
  void executiveReport;

  const snapshots = buildTrendSnapshots(report, trends);
  const relationships = buildRelationshipMap({ report, trends, correlations });
  const patterns = buildRepeatingPatterns({
    report,
    correlations: correlations.correlations,
    memoryEntries: memory.entries,
  });
  const influence_rankings = buildInfluenceRankings(snapshots, report);
  const drivers = buildDrivers(snapshots, planning);
  const drag = buildDrag(report, snapshots, planning);
  const recommendations = buildRecommendations({
    drivers,
    drag,
    planning,
    intelligence,
    copilot,
  });

  const counts_by_category = recommendations.reduce(
    (counts, item) => {
      counts[item.category] += 1;
      return counts;
    },
    Object.fromEntries(
      [
        "growth",
        "revenue",
        "engagement",
        "community",
        "operations",
        "risk",
        "platform_health",
      ].map((category) => [category, 0]),
    ) as Record<OperationalIntelligenceCategory, number>,
  );

  const topDriver = drivers[0]?.label ?? null;
  const topDrag = drag[0]?.label ?? null;

  return {
    generated_at,
    overview: {
      headline: topDriver
        ? `${topDriver} is the strongest operational driver right now${topDrag ? `; watch ${topDrag.toLowerCase()} as the primary drag signal` : ""}.`
        : "Operational intelligence is building as Nexus collects more cross-signal history.",
      relationship_count: relationships.length,
      pattern_count: patterns.length,
      driver_count: drivers.length,
      drag_count: drag.length,
      top_driver: topDriver,
      top_drag: topDrag,
    },
    relationships,
    patterns,
    influence_rankings,
    drivers,
    drag,
    recommendations,
    counts_by_category,
  };
}
