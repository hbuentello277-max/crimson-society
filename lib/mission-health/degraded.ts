import type { ReportContext } from "@/lib/reports/context";

/** Canonical degraded workflow statuses — Mark I single source of truth. */
export const DEGRADED_WORKFLOW_STATUSES = [
  "degraded",
  "impaired",
  "critical",
  "failing",
  "warn",
  "warning",
] as const;

export type DegradedWorkflowStatus = (typeof DEGRADED_WORKFLOW_STATUSES)[number];

type WorkflowLike = {
  workflow_status: string;
};

export function isDegradedWorkflowStatus(status: string): boolean {
  return DEGRADED_WORKFLOW_STATUSES.includes(
    status.toLowerCase() as DegradedWorkflowStatus,
  );
}

export function filterDegradedWorkflows<T extends WorkflowLike>(workflows: T[] | null | undefined): T[] {
  return (workflows ?? []).filter((workflow) => isDegradedWorkflowStatus(workflow.workflow_status));
}

export function countDegradedWorkflows(workflows: WorkflowLike[] | null | undefined): number {
  return filterDegradedWorkflows(workflows).length;
}

export function isOperationalStress(report: Pick<ReportContext, "mission" | "alerts" | "incidents" | "health">): boolean {
  return (
    countDegradedWorkflows(report.mission.workflows) > 0 ||
    (report.alerts.counts.active ?? 0) > 0 ||
    report.incidents.open.length > 0 ||
    report.health.systemStatus !== "operational"
  );
}

export function operationalStressFromReport(report: ReportContext): {
  degradedWorkflows: number;
  operationalStress: boolean;
} {
  const degradedWorkflows = countDegradedWorkflows(report.mission.workflows);
  return {
    degradedWorkflows,
    operationalStress: isOperationalStress(report),
  };
}
