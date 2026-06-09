import type { ExecutivePriority, ExecutiveUrgency } from "@/lib/executive-command/types";

type PriorityCandidate = {
  id: string;
  title: string;
  reason: string;
  suggested_next_action: string;
  urgency: ExecutiveUrgency;
  href: string;
  score: number;
};

function urgencyScore(urgency: ExecutiveUrgency): number {
  switch (urgency) {
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

export function buildExecutivePriorities(input: {
  risks: Array<{ id: string; title: string; summary: string; impact_score: number }>;
  opportunities: Array<{ id: string; title: string; summary: string; impact_score: number }>;
  launchBlockers: string[];
  pendingApprovals: number;
  memoryBlockers: Array<{ title: string; summary: string }>;
  platformStatus: "operational" | "warning" | "critical";
  failedJobs: number;
  openIncidents: number;
}): ExecutivePriority[] {
  const candidates: PriorityCandidate[] = [];

  if (input.openIncidents > 0) {
    candidates.push({
      id: "priority:incidents",
      title: "Resolve open incidents",
      reason: `${input.openIncidents} incident(s) are open on Platform Health.`,
      suggested_next_action: "Review incidents and prepare an incident summary draft for approval.",
      urgency: "critical",
      href: "/admin/nexus/incidents",
      score: 100,
    });
  }

  if (input.failedJobs > 0) {
    candidates.push({
      id: "priority:failed-jobs",
      title: "Review failed platform jobs",
      reason: `${input.failedJobs} scheduled platform job(s) failed.`,
      suggested_next_action: "Open Platform Status and confirm job recovery before launch push.",
      urgency: input.failedJobs > 1 ? "high" : "medium",
      href: "/admin/nexus/mission-control",
      score: 85,
    });
  }

  for (const risk of input.risks.slice(0, 2)) {
    candidates.push({
      id: `priority:risk:${risk.id}`,
      title: risk.title,
      reason: risk.summary,
      suggested_next_action: "Review Platform Intelligence and prepare an Action Center draft if recommended.",
      urgency: risk.impact_score >= 85 ? "high" : "medium",
      href: "/admin/nexus/intelligence",
      score: 70 + Math.min(20, Math.round(risk.impact_score * 0.2)),
    });
  }

  for (const blocker of input.launchBlockers.slice(0, 2)) {
    candidates.push({
      id: `priority:launch:${blocker}`,
      title: "Clear launch blocker",
      reason: blocker,
      suggested_next_action: "Review launch readiness and generate a launch plan for approval.",
      urgency: "high",
      href: "/admin/nexus/mission-control",
      score: 78,
    });
  }

  if (input.pendingApprovals > 0) {
    candidates.push({
      id: "priority:action-approvals",
      title: "Review pending Action Center approvals",
      reason: `${input.pendingApprovals} prepared action(s) are waiting for founder approval.`,
      suggested_next_action: "Open Action Center and approve or reject prepared drafts.",
      urgency: input.pendingApprovals > 3 ? "high" : "medium",
      href: "/admin/nexus/actions",
      score: input.pendingApprovals > 3 ? 88 : 80,
    });
  }

  for (const blocker of input.memoryBlockers.slice(0, 2)) {
    candidates.push({
      id: `priority:memory:${blocker.title}`,
      title: blocker.title,
      reason: blocker.summary,
      suggested_next_action: "Review founder memory and update the operating plan if needed.",
      urgency: "medium",
      href: "/admin/nexus/memory",
      score: 60,
    });
  }

  for (const opportunity of input.opportunities.slice(0, 2)) {
    candidates.push({
      id: `priority:opportunity:${opportunity.id}`,
      title: opportunity.title,
      reason: opportunity.summary,
      suggested_next_action: "Consider an Operations Planner campaign while momentum is favorable.",
      urgency: "medium",
      href: "/admin/nexus",
      score: 50 + Math.min(15, Math.round(opportunity.impact_score * 0.15)),
    });
  }

  if (input.platformStatus === "warning") {
    candidates.push({
      id: "priority:platform-warning",
      title: "Stabilize platform operations",
      reason: "Platform Status indicates operational friction.",
      suggested_next_action: "Review Platform Health and Platform Status before shipping new campaigns.",
      urgency: "high",
      href: "/admin/nexus/mission-health",
      score: 75,
    });
  }

  const deduped = new Map<string, PriorityCandidate>();
  for (const candidate of candidates) {
    const existing = deduped.get(candidate.id);
    if (!existing || candidate.score > existing.score) {
      deduped.set(candidate.id, candidate);
    }
  }

  return [...deduped.values()]
    .sort((a, b) => b.score - a.score || urgencyScore(b.urgency) - urgencyScore(a.urgency))
    .slice(0, 5)
    .map(({ score: _score, ...priority }) => priority);
}

export function emptyExecutivePriorities(): ExecutivePriority[] {
  return [
    {
      id: "priority:steady-state",
      title: "Maintain operating rhythm",
      reason: "No urgent cross-system risks or approval backlogs are active right now.",
      suggested_next_action: "Review Platform Status and today's executive summary during your next check-in.",
      urgency: "low",
      href: "/admin/nexus",
    },
  ];
}
