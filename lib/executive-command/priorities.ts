import type { NexusActionCardSummary } from "@/lib/action-center/types";
import type { CrossSystemInsight } from "@/lib/cross-system-intelligence/types";
import type { LaunchReadiness } from "@/lib/proactive-intelligence/types";
import type { ProactiveAlert } from "@/lib/proactive-intelligence/types";
import type { FounderTimelineEntry } from "@/lib/founder-copilot/types";
import type { ExecutivePriority, ExecutiveUrgency } from "@/lib/executive-command/types";

const URGENCY_RANK: Record<ExecutiveUrgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

type PriorityCandidate = ExecutivePriority & { score: number };

function pushCandidate(
  items: PriorityCandidate[],
  candidate: Omit<PriorityCandidate, "score"> & { score?: number },
) {
  const urgencyScore = 100 - URGENCY_RANK[candidate.urgency] * 25;
  items.push({
    ...candidate,
    score: candidate.score ?? urgencyScore,
  });
}

export function buildExecutivePriorities(input: {
  risks: CrossSystemInsight[];
  opportunities: CrossSystemInsight[];
  launchReadiness: LaunchReadiness;
  pendingApprovals: number;
  actionItems: NexusActionCardSummary[];
  memoryBlockers: FounderTimelineEntry[];
  proactiveAlerts: ProactiveAlert[];
  platformHealthUrgent: boolean;
}): ExecutivePriority[] {
  const candidates: PriorityCandidate[] = [];

  for (const alert of input.proactiveAlerts.slice(0, 3)) {
    pushCandidate(candidates, {
      id: `proactive:${alert.id}`,
      title: alert.title,
      reason: alert.summary,
      suggested_next_action: `Review ${alert.category.replace(/_/g, " ")} signals in the related section.`,
      urgency: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "high" : "medium",
      related_route: alert.relatedRoute,
      score: alert.severity === "critical" ? 120 : 95,
    });
  }

  const topRisk = input.risks[0];
  if (topRisk) {
    const riskUrgency: ExecutiveUrgency =
      topRisk.impact_score >= 85 ? "critical" : topRisk.impact_score >= 70 ? "high" : "medium";
    pushCandidate(candidates, {
      id: `risk:${topRisk.id}`,
      title: topRisk.title,
      reason: topRisk.summary,
      suggested_next_action: "Open Platform Intelligence and review the top risk before it compounds.",
      urgency: riskUrgency,
      related_route: topRisk.related_routes[0] ?? "/admin/nexus/intelligence",
      score: topRisk.impact_score >= 85 ? 115 : 90,
    });
  }

  for (const blocker of input.launchReadiness.blockers.slice(0, 2)) {
    pushCandidate(candidates, {
      id: `launch-blocker:${blocker}`,
      title: "Launch blocker detected",
      reason: blocker,
      suggested_next_action: "Resolve this blocker before increasing launch pressure.",
      urgency: input.launchReadiness.score < 50 ? "critical" : "high",
      related_route: "/admin/nexus/mission-health",
      score: input.launchReadiness.score < 50 ? 110 : 85,
    });
  }

  if (input.pendingApprovals > 0) {
    const pending = input.actionItems.find((item) => item.status === "pending_approval");
    pushCandidate(candidates, {
      id: pending ? `approval:${pending.id}` : "approval:queue",
      title:
        input.pendingApprovals === 1
          ? "One action awaits your approval"
          : `${input.pendingApprovals} actions await your approval`,
      reason: pending?.reason ?? "Approved actions still require owner review before execution.",
      suggested_next_action: "Open Action Center and approve or reject pending drafts.",
      urgency: input.pendingApprovals >= 3 ? "high" : "medium",
      related_route: "/admin/nexus/actions",
      score: 80 + Math.min(input.pendingApprovals, 5) * 2,
    });
  }

  for (const blocker of input.memoryBlockers.slice(0, 2)) {
    pushCandidate(candidates, {
      id: `memory-blocker:${blocker.id}`,
      title: blocker.title,
      reason: blocker.summary,
      suggested_next_action: "Review founder memory blockers and assign the next operational step.",
      urgency: blocker.entryType === "incident" ? "high" : "medium",
      related_route: "/admin/nexus/memory",
      score: blocker.entryType === "incident" ? 82 : 70,
    });
  }

  const topOpportunity = input.opportunities[0];
  if (topOpportunity) {
    pushCandidate(candidates, {
      id: `opportunity:${topOpportunity.id}`,
      title: topOpportunity.title,
      reason: topOpportunity.summary,
      suggested_next_action: "Review the opportunity and prepare an Action Center draft if it fits today's focus.",
      urgency: "medium",
      related_route: topOpportunity.related_routes[0] ?? "/admin/nexus/intelligence",
      score: 65,
    });
  }

  if (input.platformHealthUrgent) {
    pushCandidate(candidates, {
      id: "platform-health:urgent",
      title: "Platform health needs attention",
      reason: "Operational friction is elevated across alerts, incidents, or platform jobs.",
      suggested_next_action: "Open Platform Health and confirm degraded workflows or failed jobs.",
      urgency: "high",
      related_route: "/admin/nexus/mission-health",
      score: 88,
    });
  }

  const deduped = new Map<string, PriorityCandidate>();
  for (const item of candidates) {
    const existing = deduped.get(item.title);
    if (!existing || item.score > existing.score) {
      deduped.set(item.title, item);
    }
  }

  return [...deduped.values()]
    .sort((a, b) => b.score - a.score || URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency])
    .slice(0, 5)
    .map(({ score: _score, ...priority }) => priority);
}
