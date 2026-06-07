import type { DecisionPriority } from "@/lib/decision-engine/types";

export const DECISION_SCORE_WEIGHTS = {
  impact: 0.35,
  urgency: 0.25,
  confidence: 0.25,
  strategic_importance: 0.15,
} as const;

export { clampScore } from "@/lib/nexus/scoring";
import { clampScore } from "@/lib/nexus/scoring";

export function computeDecisionScore(input: {
  expected_impact: number;
  urgency_score: number;
  confidence_score: number;
  strategic_importance: number;
}): number {
  return clampScore(
    input.expected_impact * DECISION_SCORE_WEIGHTS.impact +
      input.urgency_score * DECISION_SCORE_WEIGHTS.urgency +
      input.confidence_score * DECISION_SCORE_WEIGHTS.confidence +
      input.strategic_importance * DECISION_SCORE_WEIGHTS.strategic_importance,
  );
}

export function deriveDecisionPriority(input: {
  decision_score: number;
  urgency_score: number;
  expected_impact: number;
  category: string;
}): DecisionPriority {
  if (
    input.decision_score >= 85 ||
    input.urgency_score >= 90 ||
    (input.expected_impact >= 85 && input.urgency_score >= 75)
  ) {
    return "critical";
  }

  if (input.decision_score >= 70 || input.urgency_score >= 75) {
    return "high";
  }

  if (input.decision_score >= 50) {
    return "medium";
  }

  return "low";
}

export function computeRoiScore(expectedImpact: number, effortScore: number): number {
  const effortFactor = Math.max(10, effortScore);
  return clampScore((expectedImpact / effortFactor) * 100);
}

export function decisionPriorityLabel(priority: DecisionPriority): string {
  const labels: Record<DecisionPriority, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  return labels[priority];
}

export function decisionCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    growth: "Growth",
    revenue: "Revenue",
    engagement: "Engagement",
    community: "Community",
    operations: "Operations",
    risk: "Risk",
    blackcard: "Blackcard",
    platform_health: "Platform Health",
  };
  return labels[category] ?? category;
}
