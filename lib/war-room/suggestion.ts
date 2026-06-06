import type { NexusIncidentSummaryRow } from "@/lib/incidents/types";

const HIGH_IMPACT_THRESHOLD = 75;

/**
 * Suggest opening a war room for serious incidents only — never auto-create.
 */
export function shouldSuggestWarRoom(input: {
  severity: string;
  impact_score: number;
  status: string;
  metadata?: { escalation_reason?: string | null };
}): boolean {
  if (["resolved", "postmortem"].includes(input.status)) {
    return false;
  }

  if (input.severity === "critical") {
    return true;
  }

  if (input.impact_score >= HIGH_IMPACT_THRESHOLD) {
    return true;
  }

  const reason = input.metadata?.escalation_reason;
  return (
    reason === "critical_high_impact" ||
    reason === "critical_rollup" ||
    reason === "mission_score_duration"
  );
}

export function shouldSuggestWarRoomForIncident(incident: NexusIncidentSummaryRow): boolean {
  return shouldSuggestWarRoom({
    severity: incident.severity,
    impact_score: incident.impact_score,
    status: incident.status,
    metadata: incident.metadata,
  });
}
