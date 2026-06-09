import type { ConfidenceInput, RiskInput } from "@/lib/forecasting/types";
export { clampScore } from "@/lib/nexus/scoring";
import { clampScore } from "@/lib/nexus/scoring";

export function computeConfidenceScore(input: ConfidenceInput): number | null {
  if (input.data_points < 2 || input.span_days < 3) {
    return null;
  }

  const dataScore = Math.min(40, input.data_points * 4);
  const spanScore = Math.min(20, input.span_days);
  const consistencyScore = Math.round(input.consistency * 35);
  const signalScore = Math.min(25, input.supporting_signals * 5);

  return clampScore(dataScore + spanScore + consistencyScore + signalScore);
}

export function computeRiskScore(input: RiskInput): number {
  if (input.category === "risk" || input.category === "operational") {
    let score = input.operational_stress ? 72 : 28;

    if (input.direction === "down") {
      score += 12;
    } else if (input.direction === "up") {
      score -= 8;
    }

    if (input.confidence != null && input.confidence < 60) {
      score += 8;
    }

    return clampScore(score);
  }

  let score = 20;

  if (input.direction === "down") {
    score += 45;
  } else if (input.direction === "flat") {
    score += 18;
  } else if (input.direction === "unknown") {
    score += 30;
  }

  if (input.operational_stress) {
    score += 10;
  }

  if (input.confidence != null) {
    score += Math.round((100 - input.confidence) * 0.15);
  }

  return clampScore(score);
}

export function recommendationForMembership(
  direction: "up" | "down" | "flat" | "unknown",
  available: boolean,
): string {
  if (!available) return "Collect more membership history before relying on projections.";
  if (direction === "up") return "Maintain onboarding efforts.";
  if (direction === "down") return "Review acquisition channels and onboarding conversion.";
  if (direction === "flat") return "Test new onboarding loops to restart membership momentum.";
  return "Refresh metrics and memory to improve membership forecast confidence.";
}

export function recommendationForBlackcard(
  direction: "up" | "down" | "flat" | "unknown",
  available: boolean,
): string {
  if (!available) return "Insufficient Blackcard history for a reliable projection.";
  if (direction === "up") return "Continue highlighting Blackcard value in founder touchpoints.";
  if (direction === "down") return "Review conversion paths and member upgrade messaging.";
  return "Promote Blackcard conversion opportunities.";
}

export function recommendationForRevenue(
  direction: "up" | "down" | "flat" | "unknown",
  available: boolean,
): string {
  if (!available) return "Revenue forecast unavailable until more MRR snapshots exist.";
  if (direction === "up") return "Protect current conversion momentum while monitoring churn.";
  if (direction === "down") return "Review subscription changes and Blackcard conversion trends.";
  return "Promote Blackcard conversion opportunities.";
}

export function recommendationForEngagement(
  direction: "up" | "down" | "flat" | "unknown",
  available: boolean,
): string {
  if (!available) return "Engagement forecast unavailable due to limited activity history.";
  if (direction === "up") return "Double down on the community loops driving activity.";
  if (direction === "down") return "Review posts, meets, and messaging activation loops.";
  return "Introduce focused community prompts to lift engagement.";
}

export function recommendationForOperational(
  riskScore: number,
  available: boolean,
): string {
  if (!available) return "Operational forecast unavailable until workflow history stabilizes.";
  if (riskScore >= 75) return "Review workflow degradation trends immediately.";
  if (riskScore >= 50) return "Monitor platform workflows and linked alerts closely.";
  return "Operational trajectory appears stable on current path.";
}

export function recommendationForRisk(
  riskScore: number,
  available: boolean,
): string {
  if (!available) return "Risk forecast unavailable until more operational signals accumulate.";
  if (riskScore >= 75) return "Review workflow degradation trends and open incidents.";
  if (riskScore >= 50) return "Watch alerts, incidents, and correlation risk signals.";
  return "Continue monitoring; current risk trajectory appears manageable.";
}
