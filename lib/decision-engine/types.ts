export const DECISION_CATEGORIES = [
  "growth",
  "revenue",
  "engagement",
  "community",
  "operations",
  "risk",
  "blackcard",
  "platform_health",
] as const;

export type DecisionCategory = (typeof DECISION_CATEGORIES)[number];

export const DECISION_PRIORITIES = ["critical", "high", "medium", "low"] as const;

export type DecisionPriority = (typeof DECISION_PRIORITIES)[number];

export type DecisionRecommendation = {
  id: string;
  category: DecisionCategory;
  title: string;
  summary: string;
  reasoning: string;
  expected_impact: number;
  confidence_score: number;
  urgency_score: number;
  effort_score: number;
  recommendation: string;
  related_routes: string[];
  generated_at: string;
  decision_score: number;
  priority: DecisionPriority;
  strategic_importance: number;
};

export type DecisionBrief = {
  best_decision_now: string;
  biggest_opportunity: string;
  biggest_risk: string;
  highest_roi_focus: string;
  founder_recommendation: string;
};

export type DecisionEngineSummary = {
  generated_at: string;
  brief: DecisionBrief;
  top_recommended: DecisionRecommendation[];
  highest_roi: DecisionRecommendation[];
  highest_risk: DecisionRecommendation[];
  strategic_priorities: DecisionRecommendation[];
  rankings: DecisionRecommendation[];
  counts_by_category: Record<DecisionCategory, number>;
  counts_by_priority: Record<DecisionPriority, number>;
};
