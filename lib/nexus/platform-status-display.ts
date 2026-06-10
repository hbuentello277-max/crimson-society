/**
 * UI-only helpers for explaining Platform Status vs Platform Health on Overview.
 * Does not change scoring engines — surfaces reasons from existing signals.
 */

export type PlatformStatusExplainInput = {
  platformStatusLabel: string;
  platformHealthScore: number | null;
  openIncidents: number;
  openAlerts: number;
  criticalAlerts: number;
  failedJobs: number;
  degradedWorkflows: number;
  workflowHealthScore: number | null;
};

const RISK_LABELS = new Set(["at risk", "critical", "needs attention"]);

function isRiskLabel(label: string): boolean {
  return RISK_LABELS.has(label.trim().toLowerCase());
}

export function explainPlatformStatusMismatch(input: PlatformStatusExplainInput): string | null {
  if (!isRiskLabel(input.platformStatusLabel)) {
    return null;
  }

  const reasons: string[] = [];

  if (input.openIncidents > 0) {
    reasons.push(
      `${input.openIncidents} open incident${input.openIncidents === 1 ? "" : "s"} elevate strategic Platform Status`,
    );
  }
  if (input.criticalAlerts > 0) {
    reasons.push(`${input.criticalAlerts} critical alert${input.criticalAlerts === 1 ? "" : "s"}`);
  } else if (input.openAlerts > 0) {
    reasons.push(`${input.openAlerts} open alert${input.openAlerts === 1 ? "" : "s"}`);
  }
  if (input.failedJobs > 0) {
    reasons.push(`${input.failedJobs} failed platform job${input.failedJobs === 1 ? "" : "s"}`);
  }
  if (input.degradedWorkflows > 0) {
    reasons.push(
      `${input.degradedWorkflows} degraded workflow${input.degradedWorkflows === 1 ? "" : "s"}`,
    );
  }
  if (
    input.workflowHealthScore != null &&
    input.workflowHealthScore < 50 &&
    input.degradedWorkflows === 0
  ) {
    reasons.push(`workflow health score is ${input.workflowHealthScore}`);
  }

  if (reasons.length > 0) {
    return `Platform Status is ${input.platformStatusLabel} because ${reasons.join(", ")}. Platform Health (${input.platformHealthScore ?? "—"}) measures workflow checks separately.`;
  }

  if (
    input.platformHealthScore != null &&
    input.platformHealthScore >= 80 &&
    input.openIncidents === 0 &&
    input.openAlerts === 0 &&
    input.failedJobs === 0
  ) {
    return `Platform Status uses strategic mission scoring (growth, revenue, incidents, workflow penalties). Platform Health (${input.platformHealthScore}) reflects workflow check results. A high health score can coexist with At Risk when strategic factors weigh down mission status.`;
  }

  return `Platform Status is ${input.platformStatusLabel}. Review Platform Status for the full strategic breakdown.`;
}
