import { computeRoiScore } from "@/lib/decision-engine/scoring";
import type {
  DecisionCategory,
  DecisionEngineSummary,
  DecisionPriority,
  DecisionRecommendation,
} from "@/lib/decision-engine/types";

const PRIORITY_RANK: Record<DecisionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortByDecisionScore(items: DecisionRecommendation[]): DecisionRecommendation[] {
  return [...items].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    if (b.decision_score !== a.decision_score) return b.decision_score - a.decision_score;
    return b.expected_impact - a.expected_impact;
  });
}

function countByCategory(items: DecisionRecommendation[]): Record<DecisionCategory, number> {
  const counts = {
    growth: 0,
    revenue: 0,
    engagement: 0,
    community: 0,
    operations: 0,
    risk: 0,
    blackcard: 0,
    platform_health: 0,
  } satisfies Record<DecisionCategory, number>;

  for (const item of items) {
    counts[item.category] += 1;
  }

  return counts;
}

function countByPriority(items: DecisionRecommendation[]): Record<DecisionPriority, number> {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 } satisfies Record<
    DecisionPriority,
    number
  >;

  for (const item of items) {
    counts[item.priority] += 1;
  }

  return counts;
}

export function buildDecisionBrief(
  ranked: DecisionRecommendation[],
  input: {
    biggestOpportunity: string;
    biggestRisk: string;
  },
): DecisionEngineSummary["brief"] {
  const best = ranked[0];
  const roiSorted = [...ranked].sort(
    (a, b) =>
      computeRoiScore(b.expected_impact, b.effort_score) -
      computeRoiScore(a.expected_impact, a.effort_score),
  );
  const highestRoi = roiSorted[0];

  const bestDecisionNow = best
    ? `${best.title}: ${best.recommendation}`
    : "No strategic decision recommended from current Nexus signals.";

  const highestRoiFocus = highestRoi
    ? `${highestRoi.title}: ${highestRoi.recommendation}`
    : "No high-ROI focus identified from current signals.";

  const founderRecommendation = best
    ? `Prioritize "${best.title}" (${best.priority} priority). ${best.recommendation} Address risk: ${input.biggestRisk}.`
    : `Review mission status and planning priorities. Primary risk: ${input.biggestRisk}.`;

  return {
    best_decision_now: bestDecisionNow,
    biggest_opportunity: input.biggestOpportunity,
    biggest_risk: input.biggestRisk,
    highest_roi_focus: highestRoiFocus,
    founder_recommendation: founderRecommendation,
  };
}

export function prioritizeDecisions(
  decisions: DecisionRecommendation[],
  input: {
    biggestOpportunity: string;
    biggestRisk: string;
  },
): Omit<
  DecisionEngineSummary,
  "generated_at"
> {
  const ranked = sortByDecisionScore(decisions);

  const topRecommended = ranked.slice(0, 6);

  const highestRoi = [...ranked]
    .sort(
      (a, b) =>
        computeRoiScore(b.expected_impact, b.effort_score) -
        computeRoiScore(a.expected_impact, a.effort_score),
    )
    .slice(0, 6);

  const highestRisk = ranked
    .filter((item) => item.category === "risk" || item.urgency_score >= 70)
    .slice(0, 6);

  const strategicPriorities = ranked
    .filter((item) => item.strategic_importance >= 65)
    .slice(0, 6);

  const brief = buildDecisionBrief(ranked, input);

  return {
    brief,
    top_recommended: topRecommended,
    highest_roi: highestRoi,
    highest_risk: highestRisk.length > 0 ? highestRisk : ranked.filter((item) => item.category === "risk").slice(0, 6),
    strategic_priorities:
      strategicPriorities.length > 0
        ? strategicPriorities
        : ranked.slice(0, 6),
    rankings: ranked.slice(0, 20),
    counts_by_category: countByCategory(ranked),
    counts_by_priority: countByPriority(ranked),
  };
}
