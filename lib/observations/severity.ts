import type { NexusSeverity } from "@/lib/nexus/constants";
import type { SeverityInputs } from "@/lib/observations/types";

const MEMBER_BLOCKING_WORKFLOWS = new Set([
  "user_login",
  "post_creation",
  "meet_creation",
  "messaging",
]);

export function countMemberBlockingFailures(
  failingWorkflows: string[],
  warningWorkflows: string[],
): number {
  return [...failingWorkflows, ...warningWorkflows].filter((slug) =>
    MEMBER_BLOCKING_WORKFLOWS.has(slug),
  ).length;
}

export function selectObservationSeverity(inputs: SeverityInputs): NexusSeverity {
  if (inputs.is_absence_summary) {
    return "info";
  }

  if (inputs.rule_id === "obs.growth.signups.trend") {
    if (inputs.trend_direction === "declining") {
      return "warning";
    }
    return "info";
  }

  if (inputs.rule_id === "obs.revenue.blackcard.mrr.summary") {
    return "info";
  }

  if (inputs.rule_id === "obs.mission.health.diagnosis") {
    if (
      inputs.mission_status === "critical" ||
      inputs.failing_member_workflows >= 3
    ) {
      return "critical";
    }

    if (inputs.mission_status === "degraded" || inputs.failing_member_workflows >= 1) {
      return "warning";
    }

    return "info";
  }

  if (inputs.rule_id === "obs.infra.integration.diagnosis") {
    if (inputs.degraded_integrations >= 2) {
      return "warning";
    }

    if (inputs.degraded_integrations >= 1) {
      return "warning";
    }

    return "info";
  }

  if (inputs.rule_id === "obs.infra.incidents.clear.summary") {
    return "info";
  }

  return "info";
}
