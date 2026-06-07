import type { IntelligenceCategory } from "@/lib/intelligence/types";
export { clampScore } from "@/lib/nexus/scoring";
import { clampScore } from "@/lib/nexus/scoring";

export function confidenceFromComparison(input: {
  current: number | null;
  previous: number | null;
  bothRequired?: boolean;
}): number | null {
  if (input.current == null) return null;
  if (input.bothRequired !== false && input.previous == null) return null;

  if (input.previous != null) {
    return clampScore(85);
  }

  return clampScore(70);
}

export function confidenceFromSignalStrength(input: {
  severity?: "info" | "warning" | "critical";
  dataPoints?: number;
}): number {
  let score = 75;

  if (input.severity === "critical") score = 95;
  else if (input.severity === "warning") score = 85;
  else if (input.severity === "info") score = 75;

  if (input.dataPoints != null && input.dataPoints >= 2) {
    score += 5;
  }

  return clampScore(score);
}

export function impactByCategory(category: IntelligenceCategory, boost = 0): number {
  const base: Record<IntelligenceCategory, number> = {
    growth: 70,
    revenue: 85,
    engagement: 65,
    operations: 60,
    risk: 90,
    opportunity: 55,
  };

  return clampScore(base[category] + boost);
}

export function impactFromDelta(input: {
  category: IntelligenceCategory;
  current: number;
  previous: number;
}): number {
  const delta = Math.abs(input.current - input.previous);
  const relative =
    input.previous === 0 ? (input.current > 0 ? 1 : 0) : delta / Math.abs(input.previous);
  const boost = Math.min(15, Math.round(relative * 100));
  return impactByCategory(input.category, boost);
}

export function impactFromCount(category: IntelligenceCategory, count: number, multiplier = 8): number {
  return clampScore(impactByCategory(category) + Math.min(15, count * multiplier));
}

export function impactFromSeverity(severity: string): number {
  if (severity === "critical") return 95;
  if (severity === "warning") return 80;
  return 65;
}

export function stablePercentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }

  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
