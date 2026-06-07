/** Shared Nexus score utilities — Mark I canonical implementations. */

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function stablePercentChange(current: number, previous: number | null): number | null {
  if (previous == null || !Number.isFinite(previous) || previous === 0) {
    return null;
  }

  if (!Number.isFinite(current)) {
    return null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

export function weightedScore(
  weights: Record<string, number>,
  values: Record<string, number>,
): number {
  let total = 0;
  let weightSum = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const value = values[key];
    if (value == null || !Number.isFinite(value)) continue;
    total += value * weight;
    weightSum += weight;
  }

  if (weightSum === 0) return 0;
  return clampScore(total / weightSum);
}

export function benefitFromRisk(riskScore: number, floor = 35): number {
  return Math.max(floor, 100 - riskScore);
}
