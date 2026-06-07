import type { SupabaseClient } from "@supabase/supabase-js";
import { getWeeklyOwnerBriefing } from "@/lib/briefings/weekly";
import { getNexusCorrelations } from "@/lib/correlations/summary";
import { getNexusDecisionEngine } from "@/lib/decision-engine/engine";
import { getNexusForecasting } from "@/lib/forecasting/engine";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { getNexusMissionControl } from "@/lib/mission-control/engine";
import { getNexusPlanning } from "@/lib/planning/engine";
import { loadReportContext } from "@/lib/reports/context";
import { operationalStressFromReport } from "@/lib/mission-health/degraded";
import { runCached } from "@/lib/nexus/request-cache";
import { buildEngagementScenario } from "@/lib/scenarios/engagement";
import { buildGrowthScenario } from "@/lib/scenarios/growth";
import { buildOperationsScenario } from "@/lib/scenarios/operations";
import { buildRevenueScenario } from "@/lib/scenarios/revenue";
import { scenarioTypeLabel } from "@/lib/scenarios/scoring";
import type {
  ScenarioBrief,
  ScenarioBuildContext,
  ScenarioComparisonRow,
  ScenarioRankings,
  ScenariosSummary,
  StrategicScenario,
} from "@/lib/scenarios/types";

function buildComparison(scenarios: StrategicScenario[]): ScenarioComparisonRow[] {
  return scenarios.map((scenario) => ({
    scenario_type: scenario.scenario_type,
    title: scenario.title,
    expected_benefit: scenario.expected_benefit,
    expected_risk: scenario.expected_risk,
    confidence_score: scenario.confidence_score,
    strategic_impact: scenario.strategic_impact,
    scenario_score: scenario.scenario_score,
    available: scenario.available,
  }));
}

function buildRankings(scenarios: StrategicScenario[]): ScenarioRankings {
  const available = scenarios.filter((scenario) => scenario.available);

  const byScore = [...available].sort((a, b) => b.scenario_score - a.scenario_score);
  const byGrowthBenefit = [...available].sort((a, b) => {
    if (a.scenario_type === "growth") return -1;
    if (b.scenario_type === "growth") return 1;
    return b.expected_benefit - a.expected_benefit;
  });
  const byRevenueBenefit = [...available].sort((a, b) => {
    if (a.scenario_type === "revenue") return -1;
    if (b.scenario_type === "revenue") return 1;
    return b.expected_benefit - a.expected_benefit;
  });
  const byLowestRisk = [...available].sort((a, b) => a.expected_risk - b.expected_risk);

  const nexusFavored =
    byScore.find((scenario) => scenario.scenario_type === inferFavoredType(scenarios)) ??
    byScore[0] ??
    null;

  return {
    best_overall: byScore[0] ?? null,
    highest_growth: byGrowthBenefit[0] ?? null,
    highest_revenue: byRevenueBenefit[0] ?? null,
    lowest_risk: byLowestRisk[0] ?? null,
    nexus_favored: nexusFavored,
  };
}

function inferFavoredType(scenarios: StrategicScenario[]): StrategicScenario["scenario_type"] {
  const operations = scenarios.find((scenario) => scenario.scenario_type === "operations");
  const growth = scenarios.find((scenario) => scenario.scenario_type === "growth");

  if (
    operations?.available &&
    operations.strategic_impact >= 78 &&
    growth?.available &&
    operations.expected_risk <= growth.expected_risk
  ) {
    return "operations";
  }

  const revenue = scenarios.find((scenario) => scenario.scenario_type === "revenue");

  if (growth && revenue && growth.scenario_score >= revenue.scenario_score) {
    return "growth";
  }

  return "revenue";
}

function buildBrief(
  rankings: ScenarioRankings,
  scenarios: StrategicScenario[],
): ScenarioBrief {
  const available = scenarios.filter((scenario) => scenario.available);
  const strongest = rankings.best_overall;
  const riskiest = [...available].sort((a, b) => b.expected_risk - a.expected_risk)[0] ?? null;
  const favored = rankings.nexus_favored;

  if (!strongest || available.length === 0) {
    return {
      headline: "Scenario analysis unavailable — insufficient Nexus forecast and metric data.",
      strongest_path: "Unavailable",
      riskiest_path: "Unavailable",
      favored_path: "Unavailable",
      tradeoff_summary:
        "Collect forecasting, planning, and metrics history before comparing strategic paths.",
    };
  }

  const growth = scenarios.find((scenario) => scenario.scenario_type === "growth");
  const revenue = scenarios.find((scenario) => scenario.scenario_type === "revenue");
  const engagement = scenarios.find((scenario) => scenario.scenario_type === "engagement");
  const operations = scenarios.find((scenario) => scenario.scenario_type === "operations");

  const tradeoffParts: string[] = [];
  if (growth?.available && revenue?.available) {
    tradeoffParts.push(
      `Growth offers ${growth.expected_benefit} benefit at ${growth.expected_risk} risk; Revenue offers ${revenue.expected_benefit} benefit at ${revenue.expected_risk} risk.`,
    );
  }
  if (engagement?.available && operations?.available) {
    tradeoffParts.push(
      `Engagement emphasizes activity (${engagement.expected_benefit} benefit); Operations emphasizes stability (${operations.expected_benefit} benefit, ${operations.expected_risk} risk).`,
    );
  }

  return {
    headline: `Strongest overall path: ${scenarioTypeLabel(strongest.scenario_type)} (score ${strongest.scenario_score}).`,
    strongest_path: `${strongest.title} — ${strongest.recommendation}`,
    riskiest_path: riskiest
      ? `${riskiest.title} — ${riskiest.expected_risk}/100 expected risk`
      : "No risk differentiation available",
    favored_path: favored
      ? `${favored.title} — Nexus favors this path based on current mission and forecast signals`
      : strongest.title,
    tradeoff_summary:
      tradeoffParts.join(" ") ||
      "Compare expected benefit and risk across all four strategic paths before committing founder attention.",
  };
}

export function getNexusScenarios(supabase: SupabaseClient): Promise<ScenariosSummary> {
  return runCached(supabase, "nexus:scenarios", () => getNexusScenariosImpl(supabase));
}

async function getNexusScenariosImpl(supabase: SupabaseClient): Promise<ScenariosSummary> {
  const generatedAt = new Date().toISOString();

  const [forecasting, planning, mission, decisions, correlations, intelligence, memory, report, weeklyBriefing] =
    await Promise.all([
      getNexusForecasting(supabase),
      getNexusPlanning(supabase),
      getNexusMissionControl(supabase),
      getNexusDecisionEngine(supabase),
      getNexusCorrelations(supabase, { window: "30d", sort: "impact" }),
      getNexusIntelligence(supabase, { sort: "impact" }),
      getNexusMemorySummary(supabase, { limit: 20 }),
      loadReportContext(supabase),
      getWeeklyOwnerBriefing(supabase),
    ]);

  const { operationalStress } = operationalStressFromReport(report);

  const context: ScenarioBuildContext = {
    generatedAt,
    forecasting,
    planning,
    mission,
    decisions,
    correlations,
    intelligence,
    memoryCount: memory.entries.length,
    report,
    briefingHeadline: weeklyBriefing.headline ?? null,
    operationalStress,
  };

  const growth = buildGrowthScenario(context);
  const revenue = buildRevenueScenario(context);
  const engagement = buildEngagementScenario(context);
  const operations = buildOperationsScenario(context);

  const scenarios = [growth, revenue, engagement, operations];
  const ranked = [...scenarios]
    .filter((scenario) => scenario.available)
    .sort((a, b) => b.scenario_score - a.scenario_score);

  const rankings = buildRankings(scenarios);
  const comparison = buildComparison(scenarios);
  const brief = buildBrief(rankings, scenarios);

  return {
    generated_at: generatedAt,
    available: ranked.length > 0,
    brief,
    comparison,
    growth,
    revenue,
    engagement,
    operations,
    rankings,
    ranked,
  };
}
