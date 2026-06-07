import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusCopilot } from "@/lib/copilot/engine";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { getNexusOperationalIntelligence } from "@/lib/operational-intelligence/engine";
import { getNexusPlanning } from "@/lib/planning/engine";
import { loadReportContext } from "@/lib/reports/context";
import { METRIC_KEYS } from "@/lib/metrics/types";
import { computeMissionHealthComponents } from "@/lib/mission-control/health";
import {
  buildMissionAccelerators,
  buildMissionObjectives,
  buildMissionThreats,
} from "@/lib/mission-control/priorities";
import {
  buildMissionSummary,
  buildScoreBreakdown,
  computeMissionScore,
  deriveMissionStatus,
} from "@/lib/mission-control/score";
import type {
  MissionControlSummary,
  MissionHistoryItem,
} from "@/lib/mission-control/types";

const TIMELINE_TYPES = new Set([
  "milestone",
  "deployment",
  "incident",
  "report",
  "briefing",
]);

type MetricTrend = {
  current: number;
  previous: number | null;
};

async function loadMetricTrends(supabase: SupabaseClient): Promise<Record<string, MetricTrend>> {
  const keys = [
    METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
    METRIC_KEYS.GROWTH_ACTIVE_PROFILES,
    METRIC_KEYS.REVENUE_MRR,
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
  ];

  const { data, error } = await supabase
    .from("nexus_metrics_snapshots")
    .select("metric_key, value, previous_value, period_start")
    .in("metric_key", keys)
    .order("period_start", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const trends: Record<string, MetricTrend> = {};
  for (const row of data ?? []) {
    const key = row.metric_key as string;
    if (trends[key]) continue;
    const current = Number(row.value);
    const previousRaw = row.previous_value;
    const previous =
      previousRaw == null || !Number.isFinite(Number(previousRaw)) ? null : Number(previousRaw);
    if (!Number.isFinite(current)) continue;
    trends[key] = { current, previous };
  }

  return trends;
}

function buildRecentHistory(
  memoryEntries: Awaited<ReturnType<typeof getNexusMemorySummary>>["entries"],
): MissionHistoryItem[] {
  return memoryEntries
    .filter((entry) => TIMELINE_TYPES.has(entry.entry_type))
    .slice(0, 20)
    .map((entry) => ({
      id: entry.id,
      entry_type: entry.entry_type,
      title: entry.title,
      summary: entry.summary,
      occurred_at: entry.occurred_at,
      source: entry.source,
    }));
}

export async function getNexusMissionControl(
  supabase: SupabaseClient,
): Promise<MissionControlSummary> {
  const [reportContext, planning, copilot, operational, memory, trends] = await Promise.all([
    loadReportContext(supabase),
    getNexusPlanning(supabase),
    getNexusCopilot(supabase),
    getNexusOperationalIntelligence(supabase),
    getNexusMemorySummary(supabase, { limit: 40 }),
    loadMetricTrends(supabase),
  ]);

  const healthComponents = computeMissionHealthComponents({
    report: reportContext,
    trends,
    planning,
  });
  const missionScore = computeMissionScore(healthComponents);
  const missionStatus = deriveMissionStatus({
    mission_score: missionScore,
    report: reportContext,
    components: healthComponents,
  });
  const objectives = buildMissionObjectives(planning);
  const threats = buildMissionThreats({
    planning,
    operational,
    copilot,
    report: reportContext,
  });
  const accelerators = buildMissionAccelerators({
    operational,
    copilot,
    planning,
  });
  const recentHistory = buildRecentHistory(memory.entries);

  const primaryFocus =
    copilot.guidance.primary_focus ||
    planning.priorities[0]?.title ||
    operational.overview.top_driver ||
    "Maintain operational stability and growth momentum";

  const secondaryFocus =
    copilot.guidance.secondary_focus ||
    planning.priorities[1]?.title ||
    operational.overview.top_drag ||
    "Monitor alerts and workflow health";

  const topThreat =
    threats[0]?.title ||
    copilot.top_risk?.title ||
    operational.overview.top_drag ||
    "No critical threats detected";

  const topOpportunity =
    accelerators[0]?.label ||
    copilot.top_opportunity?.title ||
    operational.overview.top_driver ||
    "No accelerators identified";

  const missionSummary = buildMissionSummary({
    mission_status: missionStatus,
    mission_score: missionScore,
    primary_focus: primaryFocus,
    top_threat: topThreat,
  });

  return {
    generated_at: new Date().toISOString(),
    mission_status: missionStatus,
    mission_score: missionScore,
    primary_focus: primaryFocus,
    secondary_focus: secondaryFocus,
    top_threat: topThreat,
    top_opportunity: topOpportunity,
    mission_summary: missionSummary,
    objectives,
    threats,
    accelerators,
    recent_history: recentHistory,
    score_breakdown: buildScoreBreakdown(healthComponents),
  };
}
