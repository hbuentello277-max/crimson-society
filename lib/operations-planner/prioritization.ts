import type { OperationsPlanPriority, OperationsPlanType } from "@/lib/operations-planner/types";

export function resolvePlanPriority(input: {
  planType: OperationsPlanType;
  riskImpact?: number;
  opportunityImpact?: number;
  launchScore?: number;
  openIncidents?: number;
}): OperationsPlanPriority {
  if (input.planType === "incident" || (input.openIncidents ?? 0) > 0) {
    return "critical";
  }

  if (input.planType === "revenue" || (input.riskImpact ?? 0) >= 85) {
    return "high";
  }

  if (input.planType === "launch" && (input.launchScore ?? 100) < 80) {
    return "high";
  }

  if (input.planType === "membership" || input.planType === "growth") {
    return (input.opportunityImpact ?? 0) >= 75 ? "high" : "medium";
  }

  return "medium";
}

export function priorityScore(priority: OperationsPlanPriority): number {
  switch (priority) {
    case "critical":
      return 100;
    case "high":
      return 80;
    case "medium":
      return 55;
    case "low":
      return 30;
  }
}
