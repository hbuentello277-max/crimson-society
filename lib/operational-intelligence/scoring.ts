import type { RelationshipStrength } from "@/lib/operational-intelligence/types";

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function relationshipStrength(
  aligned: boolean,
  bothKnown: boolean,
  opposing: boolean,
): RelationshipStrength {
  if (opposing && bothKnown) return "medium";
  if (aligned && bothKnown) return "high";
  if (bothKnown) return "medium";
  return "low";
}

export function influenceScore(input: {
  impact: number;
  confidence: number;
  alignment: number;
}): number {
  return clampScore(input.impact * 0.45 + input.confidence * 0.35 + input.alignment * 0.2);
}

export function combinedRankingScore(input: {
  influence_score: number;
  impact_score: number;
  confidence_score: number;
}): number {
  return clampScore(
    input.influence_score * 0.4 + input.impact_score * 0.35 + input.confidence_score * 0.25,
  );
}

export function strengthLabel(strength: RelationshipStrength): string {
  if (strength === "high") return "High";
  if (strength === "medium") return "Medium";
  return "Low";
}

export function directionAlignment(
  a: "up" | "down" | "flat" | "unknown",
  b: "up" | "down" | "flat" | "unknown",
): { aligned: boolean; opposing: boolean; bothKnown: boolean } {
  const bothKnown = a !== "unknown" && b !== "unknown";
  const aligned = bothKnown && a === b && a !== "flat";
  const opposing =
    bothKnown &&
    ((a === "up" && b === "down") || (a === "down" && b === "up"));
  return { aligned, opposing, bothKnown };
}

export function severityFromSignals(input: {
  impact: number;
  recurrence: number;
  confidence: number;
}): number {
  return clampScore(input.impact * 0.5 + input.recurrence * 0.3 + input.confidence * 0.2);
}
