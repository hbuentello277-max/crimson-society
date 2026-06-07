import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusCopilot } from "@/lib/copilot/engine";
import { getNexusCorrelations } from "@/lib/correlations/summary";
import { buildDecisionRecommendations } from "@/lib/decision-engine/recommendations";
import { prioritizeDecisions } from "@/lib/decision-engine/prioritization";
import type { DecisionEngineSummary } from "@/lib/decision-engine/types";
import { getNexusForecasting } from "@/lib/forecasting/engine";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { getNexusMissionControl } from "@/lib/mission-control/engine";
import { getNexusPlanning } from "@/lib/planning/engine";
import { loadReportContext } from "@/lib/reports/context";

export async function getNexusDecisionEngine(
  supabase: SupabaseClient,
): Promise<DecisionEngineSummary> {
  const generatedAt = new Date().toISOString();

  const [mission, planning, forecasting, copilot, intelligence, correlations, report, memory] =
    await Promise.all([
      getNexusMissionControl(supabase),
      getNexusPlanning(supabase),
      getNexusForecasting(supabase),
      getNexusCopilot(supabase),
      getNexusIntelligence(supabase, { sort: "impact" }),
      getNexusCorrelations(supabase, { window: "30d", sort: "impact" }),
      loadReportContext(supabase),
      getNexusMemorySummary(supabase, { limit: 30 }),
    ]);

  const membershipForecast = forecasting.forecasts.find((f) => f.category === "membership");
  const engagementForecast = forecasting.forecasts.find((f) => f.category === "engagement");

  const growthSlowing =
    (membershipForecast?.risk_score ?? 0) >= 55 ||
    forecasting.summary.highest_risk_category === "membership";

  const engagementStrong =
    (engagementForecast?.risk_score ?? 100) < 50 ||
    copilot.improving_signals.some((signal) =>
      signal.label.toLowerCase().includes("engagement"),
    );

  const decisions = buildDecisionRecommendations({
    mission,
    planning,
    forecasts: forecasting.forecasts,
    copilot,
    intelligence: intelligence.items,
    correlations: correlations.correlations,
    report,
    memoryEntries: memory.entries,
    generatedAt,
    trendSignals: {
      growthSlowing,
      engagementStrong,
    },
  });

  const biggestOpportunity =
    mission.top_opportunity ||
    copilot.top_opportunity?.title ||
    planning.brief.biggest_opportunity ||
    "No major opportunity detected.";

  const biggestRisk =
    mission.top_threat ||
    copilot.top_risk?.title ||
    planning.brief.biggest_risk ||
    "No major risk detected.";

  const prioritized = prioritizeDecisions(decisions, {
    biggestOpportunity,
    biggestRisk,
  });

  return {
    generated_at: generatedAt,
    ...prioritized,
  };
}
