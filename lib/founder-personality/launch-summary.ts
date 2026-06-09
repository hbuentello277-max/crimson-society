import type { LaunchReadiness } from "@/lib/proactive-intelligence/types";
import type { LaunchReadinessBreakdown } from "@/lib/founder-personality/types";
import { buildMetricResponse, routeLabelToNextAction } from "@/lib/founder-personality/formatter";
import type { FounderMode } from "@/lib/founder-personality/types";

const FACTOR_LABELS: Record<keyof LaunchReadiness["factors"], string> = {
  platformHealth: "Platform Health",
  openIncidents: "Incident posture",
  failedJobs: "Platform jobs",
  appStoreReadiness: "App store readiness",
  betaFeedback: "Beta feedback",
  operationalStability: "Operational stability",
};

export function buildLaunchReadinessBreakdown(launch: LaunchReadiness): LaunchReadinessBreakdown {
  const ready: string[] = [];
  const atRisk: string[] = [];

  for (const [key, score] of Object.entries(launch.factors) as Array<
    [keyof LaunchReadiness["factors"], number]
  >) {
    const label = FACTOR_LABELS[key];
    if (score >= 75) {
      ready.push(`${label} validated (${score}/100)`);
    } else if (score >= 50) {
      atRisk.push(`${label} needs validation (${score}/100)`);
    } else {
      atRisk.push(`${label} is below launch threshold (${score}/100)`);
    }
  }

  const nextMilestone =
    launch.blockers[0] ??
    (launch.status === "strong" || launch.status === "ready"
      ? "Prepare final launch communications and monitor Platform Status daily."
      : "Resolve the highest-severity blocker before expanding launch scope.");

  return {
    ready: ready.slice(0, 4),
    atRisk: atRisk.slice(0, 4),
    blocked: launch.blockers,
    nextMilestone,
  };
}

export function formatLaunchReadinessResponse(
  launch: LaunchReadiness,
  options?: { mode?: FounderMode; memoryHint?: string | null },
): string {
  const breakdown = buildLaunchReadinessBreakdown(launch);

  const readyText =
    breakdown.ready.length > 0 ? breakdown.ready.join("; ") : "Core systems are still being validated.";
  const atRiskText =
    breakdown.atRisk.length > 0 ? breakdown.atRisk.join("; ") : "No major systems flagged as at risk.";
  const blockedText =
    breakdown.blocked.length > 0 ? breakdown.blocked.join("; ") : "No hard launch blockers detected.";

  return buildMetricResponse({
    situation: `Launch readiness is ${launch.score}/100 (${launch.status}). Ready systems: ${readyText}. At risk: ${atRiskText}. Blocked: ${blockedText}.`,
    risk:
      breakdown.blocked.length > 0
        ? `Unresolved blockers can delay launch confidence and member trust.`
        : `Remaining validation gaps could surface during a broader launch push.`,
    recommendation: `${launch.summary}${options?.memoryHint ? ` ${options.memoryHint}` : ""}`,
    nextAction: `Next milestone: ${breakdown.nextMilestone} ${routeLabelToNextAction("/admin/nexus/mission-control")}`,
    confidence: launch.score >= 70 ? "Moderate to high" : "Low until blockers clear",
    impact: launch.status === "not_ready" ? "High launch risk" : "Manageable with focused follow-up",
    mode: options?.mode,
  });
}
