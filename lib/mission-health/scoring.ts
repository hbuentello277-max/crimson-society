import type {
  MissionCheckResult,
  MissionCheckStatus,
  MissionHealthStatus,
  MissionWorkflowDbStatus,
} from "@/lib/mission-health/types";
import type { MissionWorkflowDefinition } from "@/lib/mission-health/workflows";

const CHECK_STATUS_SCORE: Record<MissionCheckStatus, number> = {
  pass: 100,
  warn: 75,
  fail: 25,
};

export function workflowScoreFromCheckStatus(status: MissionCheckStatus): number {
  return CHECK_STATUS_SCORE[status];
}

export function missionStatusFromScore(score: number): MissionHealthStatus {
  if (!Number.isFinite(score)) {
    return "unknown";
  }

  if (score >= 90) {
    return "nominal";
  }

  if (score >= 70) {
    return "degraded";
  }

  if (score >= 50) {
    return "impaired";
  }

  return "critical";
}

export function isMissionCritical(status: MissionHealthStatus): boolean {
  return status === "critical";
}

export function workflowDbStatusFromCheck(status: MissionCheckStatus): MissionWorkflowDbStatus {
  if (status === "pass") {
    return "healthy";
  }

  if (status === "warn") {
    return "degraded";
  }

  if (status === "fail") {
    return "failing";
  }

  return "unknown";
}

export function computeWeightedMissionScore(
  checks: Array<{ workflow_score: number; weight: number }>,
): number {
  if (checks.length === 0) {
    return 0;
  }

  let weightedTotal = 0;
  let weightSum = 0;

  for (const check of checks) {
    weightedTotal += check.workflow_score * check.weight;
    weightSum += check.weight;
  }

  if (weightSum <= 0) {
    return 0;
  }

  return Math.round((weightedTotal / weightSum) * 100) / 100;
}

export function computeMissionHealthFromChecks(
  checks: MissionCheckResult[],
  registry: Record<string, MissionWorkflowDefinition>,
): { score: number; status: MissionHealthStatus; missionCritical: boolean } {
  const weightedInputs = checks.map((check) => ({
    workflow_score: check.workflow_score,
    weight: registry[check.workflow_slug]?.weight ?? 1,
  }));

  const score = computeWeightedMissionScore(weightedInputs);
  const status = checks.length === 0 ? "unknown" : missionStatusFromScore(score);

  return {
    score,
    status,
    missionCritical: isMissionCritical(status),
  };
}

export function eventSeverityForMissionStatus(
  status: MissionHealthStatus,
): "info" | "warning" | "critical" {
  if (status === "critical" || status === "impaired") {
    return "critical";
  }

  if (status === "degraded") {
    return "warning";
  }

  return "info";
}

export function eventSeverityForWorkflowDbStatus(
  status: MissionWorkflowDbStatus,
): "info" | "warning" | "critical" {
  if (status === "failing") {
    return "critical";
  }

  if (status === "degraded") {
    return "warning";
  }

  return "info";
}
