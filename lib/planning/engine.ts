import type { SupabaseClient } from "@supabase/supabase-js";
import { getMonthlyOwnerBriefing } from "@/lib/briefings/monthly";
import { getWeeklyOwnerBriefing } from "@/lib/briefings/weekly";
import { getNexusCorrelations } from "@/lib/correlations/summary";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import { METRIC_KEYS, type MetricKey } from "@/lib/metrics/types";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { loadReportContext } from "@/lib/reports/context";
import { getExecutiveReportSummary } from "@/lib/reports/summary";
import { evaluatePlanningGoals } from "@/lib/planning/goals";
import { buildMonthlyObjectives, buildWeeklyObjectives } from "@/lib/planning/objectives";
import {
  buildFounderPlanningBrief,
  buildPlanningOpportunities,
  buildPlanningPriorities,
  buildPlanningRisks,
} from "@/lib/planning/priorities";
import type { MetricTrend, PlanningContext, PlanningSummary } from "@/lib/planning/types";

const TREND_METRIC_KEYS: MetricKey[] = [
  METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
  METRIC_KEYS.GROWTH_SIGNUPS_MONTHLY,
  METRIC_KEYS.BLACKCARD_ACTIVE,
  METRIC_KEYS.REVENUE_MRR,
  METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
];

async function loadMetricTrends(supabase: SupabaseClient): Promise<Record<string, MetricTrend>> {
  const { data, error } = await supabase
    .from("nexus_metrics_snapshots")
    .select("metric_key, value, previous_value, period_start")
    .in("metric_key", TREND_METRIC_KEYS)
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

export async function loadPlanningContext(supabase: SupabaseClient): Promise<PlanningContext> {
  const generated_at = new Date().toISOString();

  const [
    reportContext,
    trends,
    intelligence,
    correlations,
    memory,
    weeklyBriefing,
    monthlyBriefing,
    executiveReport,
  ] = await Promise.all([
    loadReportContext(supabase),
    loadMetricTrends(supabase),
    getNexusIntelligence(supabase),
    getNexusCorrelations(supabase, { window: "7d", sort: "impact" }),
    getNexusMemorySummary(supabase, { limit: 50 }),
    getWeeklyOwnerBriefing(supabase),
    getMonthlyOwnerBriefing(supabase),
    getExecutiveReportSummary(supabase),
  ]);

  return {
    generated_at,
    metrics: reportContext.metrics,
    health: reportContext.health,
    mission: reportContext.mission,
    alerts: reportContext.alerts,
    incidents: reportContext.incidents,
    observations: reportContext.observations,
    commands: reportContext.commands,
    intelligence,
    correlations,
    memory_count: memory.entries.length,
    weekly_briefing_headline: weeklyBriefing.headline,
    monthly_briefing_headline: monthlyBriefing.headline,
    report_headline: executiveReport.community_growth.top_growth_signals[0] ?? null,
    trends,
  };
}

export async function getNexusPlanning(supabase: SupabaseClient): Promise<PlanningSummary> {
  const context = await loadPlanningContext(supabase);

  const weekly_objectives = buildWeeklyObjectives(context);
  const monthly_objectives = buildMonthlyObjectives(context);
  const risks = buildPlanningRisks(context);
  const opportunities = buildPlanningOpportunities(context);
  const priorities = buildPlanningPriorities(context, risks, opportunities);
  const brief = buildFounderPlanningBrief(context, risks, opportunities, priorities);
  const goal_status = evaluatePlanningGoals(context);

  return {
    generated_at: context.generated_at,
    brief,
    weekly_objectives,
    monthly_objectives,
    priorities,
    risks,
    opportunities,
    goal_status,
    counts: {
      weekly_objectives: weekly_objectives.length,
      monthly_objectives: monthly_objectives.length,
      priorities: priorities.length,
      risks: risks.length,
      opportunities: opportunities.length,
    },
  };
}
