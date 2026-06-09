import { clampScore } from "@/lib/nexus/scoring";
import type { OperationsPlanType } from "@/lib/operations-planner/types";

export function estimatePlanImpact(input: {
  planType: OperationsPlanType;
  confidence: number;
  riskImpact?: number;
  opportunityImpact?: number;
  launchScore?: number;
}): number {
  const base: Record<OperationsPlanType, number> = {
    incident: 90,
    revenue: 86,
    launch: 82,
    membership: 76,
    growth: 72,
  };

  let score = base[input.planType];
  score += Math.round(input.confidence * 0.08);
  if (input.riskImpact) score += Math.min(8, Math.round(input.riskImpact * 0.05));
  if (input.opportunityImpact) score += Math.min(6, Math.round(input.opportunityImpact * 0.04));
  if (input.launchScore != null && input.planType === "launch") {
    score += input.launchScore < 70 ? 6 : 0;
  }

  return clampScore(score);
}

export function estimatePlanConfidence(input: {
  signalCount: number;
  partial: boolean;
}): number {
  let score = 68 + Math.min(24, input.signalCount * 4);
  if (input.partial) score -= 10;
  return clampScore(score);
}
