import type { SupabaseClient } from "@supabase/supabase-js";
import { getWeeklyOwnerBriefing } from "@/lib/briefings/weekly";
import { getNexusCorrelations } from "@/lib/correlations/summary";
import {
  buildBlackcardForecast,
  buildEngagementForecast,
  buildMembershipForecast,
  buildOperationalForecast,
  buildRevenueForecast,
  buildRiskForecast,
} from "@/lib/forecasting/projections";
import { computeConfidenceScore, computeRiskScore } from "@/lib/forecasting/scoring";
import { analyzeMetricTrend } from "@/lib/forecasting/trends";
import type {
  ForecastCategory,
  ForecastContext,
  ForecastingResult,
  ForecastSummary,
  MetricTimeSeriesPoint,
} from "@/lib/forecasting/types";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { METRIC_KEYS } from "@/lib/metrics/types";
import { getExecutiveReportSummary } from "@/lib/reports/summary";
import { loadReportContext } from "@/lib/reports/context";
import { operationalStressFromReport } from "@/lib/mission-health/degraded";
import { runCached } from "@/lib/nexus/request-cache";

const FORECAST_METRIC_KEYS = [
  METRIC_KEYS.GROWTH_TOTAL_USERS,
  METRIC_KEYS.GROWTH_ACTIVE_PROFILES,
  METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY,
  METRIC_KEYS.BLACKCARD_ACTIVE,
  METRIC_KEYS.REVENUE_MRR,
  METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
  METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
] as const;

async function loadMissionScoreSeries(
  supabase: SupabaseClient,
): Promise<MetricTimeSeriesPoint[]> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString();
  const { data, error } = await supabase
    .from("nexus_mission_checks")
    .select("status, checked_at")
    .gte("checked_at", since)
    .order("checked_at", { ascending: true })
    .limit(1000);

  if (error) {
    return [];
  }

  const buckets = new Map<string, number[]>();

  for (const row of data ?? []) {
    const status = row.status as string;
    const score =
      status === "pass" ? 100 : status === "warn" ? 70 : status === "fail" ? 30 : 50;
    const day = (row.checked_at as string).slice(0, 10);
    const values = buckets.get(day) ?? [];
    values.push(score);
    buckets.set(day, values);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, values]) => ({
      period_start: `${day}T00:00:00.000Z`,
      value: values.reduce((sum, value) => sum + value, 0) / values.length,
    }));
}

async function loadMetricSeries(
  supabase: SupabaseClient,
): Promise<Map<string, MetricTimeSeriesPoint[]>> {
  const { data, error } = await supabase
    .from("nexus_metrics_snapshots")
    .select("metric_key, value, period_start")
    .in("metric_key", [...FORECAST_METRIC_KEYS])
    .order("period_start", { ascending: true })
    .limit(2000);

  if (error) {
    throw new Error(error.message);
  }

  const series = new Map<string, MetricTimeSeriesPoint[]>();

  for (const row of data ?? []) {
    const value = Number(row.value);
    if (!Number.isFinite(value)) continue;

    const key = row.metric_key as string;
    const points = series.get(key) ?? [];
    points.push({
      period_start: row.period_start as string,
      value,
    });
    series.set(key, points);
  }

  return series;
}

function countSupportingSignals(input: {
  correlations: number;
  intelligence: number;
  memory_entries: number;
  report_signals: number;
  briefing_available: boolean;
}): number {
  let count = 0;
  if (input.correlations > 0) count += 1;
  if (input.intelligence > 0) count += 1;
  if (input.memory_entries >= 5) count += 1;
  if (input.report_signals > 0) count += 1;
  if (input.briefing_available) count += 1;
  return count;
}

function buildSummary(forecasts: ForecastingResult["forecasts"]): ForecastSummary {
  const available = forecasts.filter((forecast) => forecast.available);
  const confidences = available
    .map((forecast) => forecast.confidence_score)
    .filter((score): score is number => score != null);

  const highestRisk = [...forecasts].sort((a, b) => b.risk_score - a.risk_score)[0] ?? null;

  return {
    generated_at: forecasts[0]?.generated_at ?? new Date().toISOString(),
    headline:
      available.length > 0
        ? `Deterministic forecasts available for ${available.length} of ${forecasts.length} categories based on current Nexus trends.`
        : "Forecast unavailable until enough historical Nexus data is collected.",
    available_count: available.length,
    unavailable_count: forecasts.length - available.length,
    average_confidence:
      confidences.length > 0
        ? Math.round(confidences.reduce((sum, score) => sum + score, 0) / confidences.length)
        : null,
    highest_risk_category: highestRisk?.category ?? null,
  };
}

export function getNexusForecasting(
  supabase: SupabaseClient,
): Promise<ForecastingResult> {
  return runCached(supabase, "nexus:forecasting", () => getNexusForecastingImpl(supabase));
}

async function getNexusForecastingImpl(
  supabase: SupabaseClient,
): Promise<ForecastingResult> {
  const generated_at = new Date().toISOString();

  const [
    seriesMap,
    missionScoreSeries,
    reportContext,
    correlations,
    intelligence,
    memory,
    executiveReport,
    weeklyBriefing,
  ] = await Promise.all([
    loadMetricSeries(supabase),
    loadMissionScoreSeries(supabase),
    loadReportContext(supabase),
    getNexusCorrelations(supabase, { window: "30d", sort: "impact" }),
    getNexusIntelligence(supabase, { sort: "impact" }),
    getNexusMemorySummary(supabase, { limit: 40 }),
    getExecutiveReportSummary(supabase),
    getWeeklyOwnerBriefing(supabase),
  ]);

  const membershipSeries =
    seriesMap.get(METRIC_KEYS.GROWTH_TOTAL_USERS) ??
    seriesMap.get(METRIC_KEYS.GROWTH_ACTIVE_PROFILES) ??
    [];

  const membershipTrend = analyzeMetricTrend(METRIC_KEYS.GROWTH_TOTAL_USERS, membershipSeries);
  const blackcardTrend = analyzeMetricTrend(
    METRIC_KEYS.BLACKCARD_ACTIVE,
    seriesMap.get(METRIC_KEYS.BLACKCARD_ACTIVE) ?? [],
  );
  const revenueTrend = analyzeMetricTrend(
    METRIC_KEYS.REVENUE_MRR,
    seriesMap.get(METRIC_KEYS.REVENUE_MRR) ?? [],
  );
  const postsTrend = analyzeMetricTrend(
    METRIC_KEYS.ACTIVITY_POSTS_WEEKLY,
    seriesMap.get(METRIC_KEYS.ACTIVITY_POSTS_WEEKLY) ?? [],
  );
  const meetsTrend = analyzeMetricTrend(
    METRIC_KEYS.ACTIVITY_MEETS_WEEKLY,
    seriesMap.get(METRIC_KEYS.ACTIVITY_MEETS_WEEKLY) ?? [],
  );
  const messagesTrend = analyzeMetricTrend(
    METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY,
    seriesMap.get(METRIC_KEYS.ACTIVITY_MESSAGES_WEEKLY) ?? [],
  );

  const missionScoreTrend = analyzeMetricTrend("mission.workflow_score", missionScoreSeries);

  const { operationalStress: operational_stress } = operationalStressFromReport(reportContext);

  const supporting_signals = countSupportingSignals({
    correlations: correlations.correlations.length,
    intelligence: intelligence.items.length,
    memory_entries: memory.entries.length,
    report_signals: executiveReport.community_growth.top_growth_signals.length,
    briefing_available: Boolean(weeklyBriefing.headline),
  });

  const forecasts = [
    buildMembershipForecast({
      trend: membershipTrend,
      supporting_signals,
      operational_stress,
      generated_at,
    }),
    buildBlackcardForecast({
      trend: blackcardTrend,
      supporting_signals,
      operational_stress,
      generated_at,
    }),
    buildRevenueForecast({
      trend: revenueTrend,
      supporting_signals,
      operational_stress,
      generated_at,
    }),
    buildEngagementForecast({
      postsTrend,
      meetsTrend,
      messagesTrend,
      supporting_signals,
      operational_stress,
      generated_at,
    }),
    buildOperationalForecast({
      missionScoreTrend,
      supporting_signals,
      operational_stress,
      generated_at,
    }),
  ];

  const aggregateConfidence = computeConfidenceScore({
    data_points: Math.max(
      membershipTrend.data_points,
      revenueTrend.data_points,
      postsTrend.data_points,
    ),
    span_days: Math.max(
      membershipTrend.span_days,
      revenueTrend.span_days,
      postsTrend.span_days,
    ),
    consistency:
      (membershipTrend.consistency + revenueTrend.consistency + postsTrend.consistency) / 3,
    supporting_signals,
  });

  const aggregateDirection =
    membershipTrend.direction === "down" || revenueTrend.direction === "down"
      ? "down"
      : membershipTrend.direction === "up" && revenueTrend.direction === "up"
        ? "up"
        : "flat";

  const riskScore = computeRiskScore({
    confidence: aggregateConfidence,
    direction: aggregateDirection,
    operational_stress,
    category: "risk",
  });

  forecasts.push(
    buildRiskForecast({
      riskScore,
      confidence_score: aggregateConfidence,
      operational_stress,
      direction: aggregateDirection,
      generated_at,
      available: aggregateConfidence != null,
    }),
  );

  const counts_by_category = forecasts.reduce(
    (counts, forecast) => {
      counts[forecast.category] += 1;
      return counts;
    },
    {
      membership: 0,
      blackcard: 0,
      revenue: 0,
      engagement: 0,
      operational: 0,
      risk: 0,
    } as Record<ForecastCategory, number>,
  );

  return {
    generated_at,
    summary: buildSummary(forecasts),
    forecasts,
    counts_by_category,
  };
}

export type { ForecastContext };
