import type { AlertEvaluationContext } from "@/lib/alerts/types";
import type {
  EscalationAlertRow,
  EscalationCandidate,
  EscalationReason,
} from "@/lib/incidents/types";

const ROLLUP_WINDOW_MS = 30 * 60_000;
const ROLLUP_MIN_CRITICAL = 3;
const ROLLUP_MIN_COMBINED_IMPACT = 200;
const INTEGRATION_DOWN_MINUTES = 10;
const MISSION_SCORE_CRITICAL_MINUTES = 15;
const MISSION_SCORE_CRITICAL_THRESHOLD = 50;

export function getAlertImpactScore(alert: EscalationAlertRow): number {
  const raw = alert.metadata?.impact_score;
  return typeof raw === "number" ? raw : 0;
}

function minutesSince(iso: string | null | undefined, evaluatedAt: string): number {
  if (!iso) {
    return 0;
  }

  return Math.max(0, (new Date(evaluatedAt).getTime() - new Date(iso).getTime()) / 60_000);
}

function isIntegrationDownAlert(alert: EscalationAlertRow): boolean {
  if (alert.rule_id === "health.integration.down") {
    return true;
  }

  const evidence = alert.metadata?.evidence;
  if (!evidence || typeof evidence !== "object") {
    return false;
  }

  return (evidence as Record<string, unknown>).status === "down";
}

function isMissionScoreCriticalAlert(alert: EscalationAlertRow): boolean {
  if (alert.rule_id === "mission.score.critical") {
    return true;
  }

  const evidence = alert.metadata?.evidence;
  if (!evidence || typeof evidence !== "object") {
    return false;
  }

  const value = (evidence as Record<string, unknown>).value;
  return typeof value === "number" && value < MISSION_SCORE_CRITICAL_THRESHOLD;
}

export function shouldEscalateAlert(input: {
  alert: EscalationAlertRow;
  evaluated_at: string;
}): EscalationReason | null {
  const { alert, evaluated_at } = input;

  if (alert.category === "recovery") {
    return null;
  }

  if (alert.incident_id) {
    return null;
  }

  if (!["active", "acknowledged"].includes(alert.status)) {
    return null;
  }

  const impact = getAlertImpactScore(alert);
  const firstSeen =
    typeof alert.metadata?.first_seen_at === "string"
      ? alert.metadata.first_seen_at
      : alert.created_at;

  if (impact >= 75 && alert.severity === "critical") {
    return "critical_high_impact";
  }

  if (impact >= 85) {
    return "high_impact";
  }

  if (isIntegrationDownAlert(alert) && minutesSince(firstSeen, evaluated_at) >= INTEGRATION_DOWN_MINUTES) {
    return "integration_down_duration";
  }

  if (
    isMissionScoreCriticalAlert(alert) &&
    minutesSince(firstSeen, evaluated_at) >= MISSION_SCORE_CRITICAL_MINUTES
  ) {
    return "mission_score_duration";
  }

  return null;
}

export function findIndividualEscalationCandidates(input: {
  alerts: EscalationAlertRow[];
  evaluated_at: string;
}): EscalationCandidate[] {
  const candidates: EscalationCandidate[] = [];

  for (const alert of input.alerts) {
    const reason = shouldEscalateAlert({ alert, evaluated_at: input.evaluated_at });
    if (!reason) {
      continue;
    }

    candidates.push({
      alert,
      reason,
      impact_score: getAlertImpactScore(alert),
    });
  }

  return candidates;
}

export function findRollupEscalationCandidates(input: {
  alerts: EscalationAlertRow[];
  evaluated_at: string;
  exclude_alert_ids?: Set<string>;
}): EscalationCandidate[] {
  const windowStart = new Date(new Date(input.evaluated_at).getTime() - ROLLUP_WINDOW_MS).toISOString();
  const exclude = input.exclude_alert_ids ?? new Set<string>();

  const criticalInWindow = input.alerts
    .filter((alert) => {
      if (exclude.has(alert.id) || alert.incident_id || alert.category === "recovery") {
        return false;
      }

      if (alert.severity !== "critical") {
        return false;
      }

      if (!["active", "acknowledged"].includes(alert.status)) {
        return false;
      }

      return alert.updated_at >= windowStart;
    })
    .sort((a, b) => getAlertImpactScore(b) - getAlertImpactScore(a));

  if (criticalInWindow.length < ROLLUP_MIN_CRITICAL) {
    return [];
  }

  const topThree = criticalInWindow.slice(0, 3);
  const combinedImpact = topThree.reduce((sum, alert) => sum + getAlertImpactScore(alert), 0);

  if (combinedImpact < ROLLUP_MIN_COMBINED_IMPACT) {
    return [];
  }

  return topThree.map((alert) => ({
    alert,
    reason: "critical_rollup" as const,
    impact_score: getAlertImpactScore(alert),
  }));
}

export function buildIncidentTitle(input: {
  reason: EscalationReason;
  primary_alert: EscalationAlertRow;
  alert_count?: number;
}): string {
  if (input.reason === "critical_rollup") {
    return `Multi-alert incident (${input.alert_count ?? 3} critical alerts)`;
  }

  return input.primary_alert.title;
}

export function buildIncidentSeverity(alerts: EscalationAlertRow[]): "critical" | "warning" {
  return alerts.some((alert) => alert.severity === "critical") ? "critical" : "warning";
}

export function buildImpactSummary(reason: EscalationReason): string {
  switch (reason) {
    case "critical_high_impact":
      return "Critical alert with high impact score escalated to incident.";
    case "high_impact":
      return "High impact score alert escalated to incident.";
    case "integration_down_duration":
      return "Integration down beyond duration threshold.";
    case "mission_score_duration":
      return "Platform health score critically low beyond duration threshold.";
    case "critical_rollup":
      return "Multiple critical alerts with combined high impact within 30 minutes.";
    default:
      return "Alert escalated to incident.";
  }
}

export function integrationIdFromAlert(
  alert: EscalationAlertRow,
  context?: AlertEvaluationContext,
): string | null {
  const evidence = alert.metadata?.evidence;
  if (evidence && typeof evidence === "object") {
    const slug = (evidence as Record<string, unknown>).integration_slug;
    if (typeof slug === "string" && context?.integrations[slug]) {
      return context.integrations[slug].id;
    }
  }

  return null;
}
