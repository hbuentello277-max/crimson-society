export const PLANNING_GOAL_CATEGORIES = [
  "growth",
  "revenue",
  "engagement",
  "community",
  "operations",
  "risk",
] as const;

export type PlanningGoalCategory = (typeof PLANNING_GOAL_CATEGORIES)[number];

export type PlanningUrgency = "critical" | "high" | "medium" | "low";

export type PlanningHorizon = "weekly" | "monthly";

export type PlanningObjective = {
  id: string;
  horizon: PlanningHorizon;
  category: PlanningGoalCategory;
  title: string;
  summary: string;
  confidence_score: number;
  impact_score: number;
  recommendation: string;
  related_routes: string[];
  on_track: boolean | null;
};

export type PlanningRisk = {
  id: string;
  category: PlanningGoalCategory;
  title: string;
  summary: string;
  confidence_score: number;
  impact_score: number;
  recommendation: string;
  related_routes: string[];
};

export type PlanningOpportunity = {
  id: string;
  category: PlanningGoalCategory;
  title: string;
  summary: string;
  confidence_score: number;
  impact_score: number;
  recommendation: string;
  related_routes: string[];
};

export type PlanningPriority = {
  id: string;
  title: string;
  summary: string;
  category: PlanningGoalCategory;
  urgency: PlanningUrgency;
  confidence_score: number;
  impact_score: number;
  recommendation: string;
  related_routes: string[];
};

export type FounderPlanningBrief = {
  overall_direction: string;
  biggest_opportunity: string;
  biggest_risk: string;
  primary_focus: string;
  secondary_focus: string;
  next_recommended_action: string;
};

export type PlanningGoalStatus = {
  id: string;
  category: PlanningGoalCategory;
  title: string;
  status: "on_track" | "off_track" | "unknown";
  summary: string;
};

export type PlanningSummary = {
  generated_at: string;
  brief: FounderPlanningBrief;
  weekly_objectives: PlanningObjective[];
  monthly_objectives: PlanningObjective[];
  priorities: PlanningPriority[];
  risks: PlanningRisk[];
  opportunities: PlanningOpportunity[];
  goal_status: PlanningGoalStatus[];
  counts: {
    weekly_objectives: number;
    monthly_objectives: number;
    priorities: number;
    risks: number;
    opportunities: number;
  };
};

export type MetricTrend = {
  current: number;
  previous: number | null;
};

export type PlanningContext = {
  generated_at: string;
  metrics: Awaited<ReturnType<typeof import("@/lib/metrics/summary").getNexusMetricsSummary>>;
  health: Awaited<ReturnType<typeof import("@/lib/monitoring/health-summary").getNexusHealthSnapshot>>;
  mission: Awaited<ReturnType<typeof import("@/lib/mission-health/summary").getMissionHealthSnapshot>>;
  alerts: Awaited<ReturnType<typeof import("@/lib/alerts/summary").getNexusAlertsSummary>>;
  incidents: Awaited<ReturnType<typeof import("@/lib/incidents/summary").getNexusIncidentsSummary>>;
  observations: Awaited<ReturnType<typeof import("@/lib/observations/summary").getNexusObservationsSummary>>;
  commands: Awaited<ReturnType<typeof import("@/lib/commands/summary").getNexusCommandsSummary>>;
  intelligence: Awaited<ReturnType<typeof import("@/lib/intelligence/engine").getNexusIntelligence>>;
  correlations: Awaited<ReturnType<typeof import("@/lib/correlations/summary").getNexusCorrelations>>;
  memory_count: number;
  weekly_briefing_headline: string | null;
  monthly_briefing_headline: string | null;
  report_headline: string | null;
  trends: Record<string, MetricTrend>;
};
