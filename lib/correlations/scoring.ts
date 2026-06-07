import type { CorrelationCategory } from "@/lib/correlations/types";

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function confidenceFromComparison(input: {
  current: number | null;
  previous: number | null;
  signalCount?: number;
}): number | null {
  if (input.current == null) return null;
  if (input.previous == null) return clampScore(65);

  let score = 82;
  if ((input.signalCount ?? 0) >= 3) score += 8;
  else if ((input.signalCount ?? 0) >= 2) score += 5;

  return clampScore(score);
}

export function confidenceFromCoMovement(signalCount: number, required: number): number | null {
  if (signalCount < required) return null;
  return clampScore(70 + Math.min(20, (signalCount - required + 1) * 6));
}

export function confidenceFromEventLinkage(input: {
  eventCount: number;
  severity?: "warning" | "critical";
}): number {
  let score = 72 + Math.min(18, input.eventCount * 6);
  if (input.severity === "critical") score += 8;
  if (input.severity === "warning") score += 4;
  return clampScore(score);
}

export function impactByCategory(category: CorrelationCategory, boost = 0): number {
  const base: Record<CorrelationCategory, number> = {
    growth: 72,
    revenue: 86,
    engagement: 68,
    operations: 74,
    risk: 92,
    community: 70,
    blackcard: 84,
    platform_health: 88,
  };

  return clampScore(base[category] + boost);
}

export function impactFromSignalCount(category: CorrelationCategory, count: number): number {
  return clampScore(impactByCategory(category) + Math.min(12, count * 4));
}

export function stablePercentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }

  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
