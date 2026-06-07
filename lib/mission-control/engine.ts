import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusCopilot } from "@/lib/copilot/engine";
import {
  loadMetricSnapshotTrends,
  MISSION_CONTROL_TREND_KEYS,
} from "@/lib/metrics/trends";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { getNexusOperationalIntelligence } from "@/lib/operational-intelligence/engine";
import { getNexusPlanning } from "@/lib/planning/engine";
import { loadReportContext } from "@/lib/reports/context";
import { runCached } from "@/lib/nexus/request-cache";
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

export function getNexusMissionControl(
  supabase: SupabaseClient,
): Promise<MissionControlSummary> {
  return runCached(supabase, "nexus:mission-control", () => getNexusMissionControlImpl(supabase));
}

async function getNexusMissionControlImpl(
  supabase: SupabaseClient,
): Promise<MissionControlSummary> {
  const [reportContext, planning, copilot, operational, memory, trends] = await Promise.all([
    loadReportContext(supabase),
    getNexusPlanning(supabase),
    getNexusCopilot(supabase),
    getNexusOperationalIntelligence(supabase),
    getNexusMemorySummary(supabase, { limit: 40 }),
    loadMetricSnapshotTrends(supabase, MISSION_CONTROL_TREND_KEYS),
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
