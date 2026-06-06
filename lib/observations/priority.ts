import type { NexusSeverity } from "@/lib/nexus/constants";

export type ObservationPriorityTier = "critical" | "high" | "medium" | "low";

function severityWeight(severity: NexusSeverity): number {
  if (severity === "critical") {
    return 2;
  }

  if (severity === "warning") {
    return 1.5;
  }

  return 1;
}

function recencyFactor(occurredAt: string, collectedAt: string): number {
  const ageMs = new Date(collectedAt).getTime() - new Date(occurredAt).getTime();
  if (ageMs < 60 * 60_000) {
    return 1;
  }

  if (ageMs < 6 * 60 * 60_000) {
    return 0.9;
  }

  if (ageMs < 24 * 60 * 60_000) {
    return 0.75;
  }

  return 0.6;
}

export function computePriorityScore(input: {
  confidence: number;
  severity: NexusSeverity;
  occurredAt: string;
  collectedAt?: string;
}): number {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  return (
    Math.round(
      input.confidence *
        severityWeight(input.severity) *
        recencyFactor(input.occurredAt, collectedAt) *
        1000,
    ) / 1000
  );
}

export function getPriorityTier(
  priorityScore: number,
  severity: NexusSeverity,
): ObservationPriorityTier {
  if (severity === "critical" && priorityScore >= 1.4) {
    return "critical";
  }

  if (priorityScore >= 1.25) {
    return "high";
  }

  if (priorityScore >= 0.75) {
    return "medium";
  }

  return "low";
}

export function buildPriorityMetadata(input: {
  confidence: number;
  severity: NexusSeverity;
  occurredAt: string;
  collectedAt?: string;
}): { priority_score: number; priority_tier: ObservationPriorityTier } {
  const priority_score = computePriorityScore(input);
  return {
    priority_score,
    priority_tier: getPriorityTier(priority_score, input.severity),
  };
}
