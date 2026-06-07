export const SCENARIO_TYPES = ["growth", "revenue", "engagement", "operations"] as const;

export type ScenarioType = (typeof SCENARIO_TYPES)[number];

export type ScenarioProjection = {
  label: string;
  value: string;
};

export type StrategicScenario = {
  id: string;
  scenario_type: ScenarioType;
  title: string;
  summary: string;
  projected_benefits: ScenarioProjection[];
  projected_risks: ScenarioProjection[];
  confidence_score: number | null;
  impact_score: number;
  expected_benefit: number;
  expected_risk: number;
  strategic_impact: number;
  scenario_score: number;
  recommendation: string;
  related_routes: string[];
  available: boolean;
  generated_at: string;
};

export type ScenarioComparisonRow = {
  scenario_type: ScenarioType;
  title: string;
  expected_benefit: number;
  expected_risk: number;
  confidence_score: number | null;
  strategic_impact: number;
  scenario_score: number;
  available: boolean;
};

export type ScenarioRankings = {
  best_overall: StrategicScenario | null;
  highest_growth: StrategicScenario | null;
  highest_revenue: StrategicScenario | null;
  lowest_risk: StrategicScenario | null;
  nexus_favored: StrategicScenario | null;
};

export type ScenarioBrief = {
  headline: string;
  strongest_path: string;
  riskiest_path: string;
  favored_path: string;
  tradeoff_summary: string;
};

export type ScenariosSummary = {
  generated_at: string;
  available: boolean;
  brief: ScenarioBrief;
  comparison: ScenarioComparisonRow[];
  growth: StrategicScenario;
  revenue: StrategicScenario;
  engagement: StrategicScenario;
  operations: StrategicScenario;
  rankings: ScenarioRankings;
  ranked: StrategicScenario[];
};

export type ScenarioBuildContext = {
  generatedAt: string;
  forecasting: Awaited<ReturnType<typeof import("@/lib/forecasting/engine").getNexusForecasting>>;
  planning: Awaited<ReturnType<typeof import("@/lib/planning/engine").getNexusPlanning>>;
  mission: Awaited<ReturnType<typeof import("@/lib/mission-control/engine").getNexusMissionControl>>;
  decisions: Awaited<ReturnType<typeof import("@/lib/decision-engine/engine").getNexusDecisionEngine>>;
  correlations: Awaited<ReturnType<typeof import("@/lib/correlations/summary").getNexusCorrelations>>;
  intelligence: Awaited<ReturnType<typeof import("@/lib/intelligence/engine").getNexusIntelligence>>;
  memoryCount: number;
  report: Awaited<ReturnType<typeof import("@/lib/reports/context").loadReportContext>>;
  briefingHeadline: string | null;
  operationalStress: boolean;
};
