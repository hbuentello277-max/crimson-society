import type { FounderBriefing, FounderRecommendations } from "@/lib/founder-copilot/types";
import type { FounderPriorityEngine, MorningBriefing } from "@/lib/proactive-intelligence/types";
import type { FounderMode, FounderMorningGuidance } from "@/lib/founder-personality/types";
import { buildMetricResponse, routeLabelToNextAction } from "@/lib/founder-personality/formatter";
import { formatLaunchReadinessResponse } from "@/lib/founder-personality/launch-summary";
import { rankFounderPriorityItems } from "@/lib/founder-personality/priority";

export function buildMorningGuidance(briefing: MorningBriefing): FounderMorningGuidance {
  const ranked = rankFounderPriorityItems(briefing.priority.rankedItems);
  const topActions = [
    briefing.priority.recommendedNextAction?.title,
    ...ranked.slice(0, 3).map((item) => item.title),
    ...briefing.recommendedActions.slice(0, 2),
  ]
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);

  const platformSection = briefing.sections.find((section) => section.label === "Platform Health");

  return {
    platformStatus: platformSection?.value ?? `${briefing.headline}`,
    launchReadiness: `${briefing.launchReadiness.score}/100 (${briefing.launchReadiness.status})`,
    biggestRisk:
      briefing.priority.highestPriorityIssue?.title ??
      "No critical platform risk is dominating the signal stack.",
    biggestOpportunity:
      briefing.priority.highestOpportunity?.title ??
      "No standout growth opportunity is elevated above baseline operations.",
    recommendedFocusToday:
      briefing.priority.recommendedNextAction?.title ??
      "Maintain Platform Status review and clear any open alerts.",
    topActions:
      topActions.length > 0 ? topActions : ["Review Platform Status and clear any open alerts."],
  };
}

export function formatMorningBriefingStructured(
  briefing: MorningBriefing,
  options?: { mode?: FounderMode; memoryHints?: string[] },
): string {
  const guidance = buildMorningGuidance(briefing);
  const memoryHint = options?.memoryHints?.[0] ?? null;

  const alertSignal =
    briefing.proactiveAlerts.length > 0
      ? `${briefing.proactiveAlerts.length} proactive signal(s) need review.`
      : "Platform signals are stable across revenue, members, and operations.";

  return buildMetricResponse({
    situation: `Morning briefing. Platform Status: ${guidance.platformStatus}. Launch readiness: ${guidance.launchReadiness}. ${alertSignal}`,
    risk: `${guidance.biggestRisk}. ${briefing.priority.highestPriorityIssue?.reason ?? "No elevated incident or alert is currently dominating."}`,
    recommendation: `Biggest opportunity: ${guidance.biggestOpportunity}. Recommended focus today: ${guidance.recommendedFocusToday}.${memoryHint ? ` Memory context: ${memoryHint}.` : ""}`,
    nextAction: `Top actions: ${guidance.topActions.join("; ")}.`,
    confidence: briefing.launchReadiness.score >= 70 ? "Moderate" : "Low until blockers clear",
    impact: briefing.proactiveAlerts.some((alert) => alert.severity === "critical")
      ? "High operational impact"
      : "Moderate business impact",
    mode: options?.mode,
  });
}

export function formatFounderBriefingStructured(
  briefing: FounderBriefing,
  options?: { mode?: FounderMode; memoryHints?: string[] },
): string {
  const memoryHint = options?.memoryHints?.[0] ?? null;

  return buildMetricResponse({
    situation: `Platform is ${briefing.platformHealth.status}. Platform Health score ${briefing.platformHealth.missionScore ?? "n/a"}. Membership this week: ${briefing.membershipGrowth.newUsersThisWeek ?? "n/a"}. Blackcard members: ${briefing.blackcardGrowth.activeMembers ?? "n/a"}. Revenue today: ${briefing.revenueSummary.revenueToday ?? "n/a"}.`,
    risk: `${briefing.openAlerts.critical} critical alert(s), ${briefing.failedPlatformJobs.failedCount} failed platform job(s), and ${briefing.pendingReports} pending report(s) can disrupt member trust.`,
    recommendation:
      briefing.recommendedActions.length > 0
        ? `${briefing.recommendedActions.slice(0, 2).join("; ")}.${memoryHint ? ` Memory context: ${memoryHint}.` : ""}`
        : `Maintain operational rhythm and review Platform Health.${memoryHint ? ` Memory context: ${memoryHint}.` : ""}`,
    nextAction: routeLabelToNextAction("/admin/nexus/mission-control"),
    mode: options?.mode,
  });
}

export function formatRecommendationsStructured(
  recommendations: FounderRecommendations,
  options?: { mode?: FounderMode; memoryHints?: string[] },
): string {
  if (recommendations.recommendations.length === 0) {
    return buildMetricResponse({
      situation: "No urgent founder recommendations are elevated right now.",
      risk: "Complacency can hide emerging platform or revenue drift.",
      recommendation: "Review Platform Status and confirm alerts, jobs, and reports are clear.",
      nextAction: routeLabelToNextAction("/admin/nexus/mission-control"),
      mode: options?.mode,
    });
  }

  const top = recommendations.recommendations.slice(0, 3);
  const memoryHint = options?.memoryHints?.[0] ?? null;

  return buildMetricResponse({
    situation: `Top recommendations: ${top.map((item) => item.title).join("; ")}.`,
    risk: recommendations.topRisk
      ? `Top risk: ${recommendations.topRisk}.`
      : "No single risk is dominating the recommendation stack.",
    recommendation: `${top.map((item) => `${item.title} — ${item.reason}`).join("; ")}.${memoryHint ? ` Memory context: ${memoryHint}.` : ""}`,
    nextAction: routeLabelToNextAction(top[0]?.relatedRoute),
    mode: options?.mode,
  });
}

export function formatPriorityGuidance(
  priority: FounderPriorityEngine,
  options?: {
    mode?: FounderMode;
    memoryHints?: string[];
    question?: "focus" | "risk" | "opportunity" | "matters";
  },
): string {
  const ranked = rankFounderPriorityItems(priority.rankedItems);
  const memoryHint = options?.memoryHints?.[0] ?? null;

  switch (options?.question) {
    case "risk": {
      const risk = priority.highestPriorityIssue ?? ranked[0];
      if (!risk) {
        return buildMetricResponse({
          situation: "No major risk signal is standing above the rest right now.",
          risk: "Hidden operational drift is still possible without daily Platform Status review.",
          recommendation: "Scan alerts, failed jobs, and incidents once today.",
          nextAction: routeLabelToNextAction("/admin/nexus/alerts"),
          mode: options?.mode,
        });
      }
      return buildMetricResponse({
        situation: `Biggest risk: ${risk.title}.`,
        risk: risk.reason,
        recommendation: `Address ${risk.title} before lower-priority growth work.${memoryHint ? ` Memory context: ${memoryHint}.` : ""}`,
        nextAction: routeLabelToNextAction(risk.relatedRoute),
        mode: options?.mode,
      });
    }
    case "opportunity": {
      const opportunity = priority.highestOpportunity;
      if (!opportunity) {
        return buildMetricResponse({
          situation: "No standout opportunity is elevated above baseline operations.",
          risk: "Under-investing in growth while platform is stable can slow momentum.",
          recommendation: "Review member growth, Blackcard conversion, and revenue signals.",
          nextAction: routeLabelToNextAction("/admin/nexus/copilot"),
          mode: options?.mode,
        });
      }
      return buildMetricResponse({
        situation: `Biggest opportunity: ${opportunity.title}.`,
        risk: "Delaying a clear growth lever can leave revenue and retention on the table.",
        recommendation: `${opportunity.reason}${memoryHint ? ` Memory context: ${memoryHint}.` : ""}`,
        nextAction: routeLabelToNextAction(opportunity.relatedRoute),
        mode: options?.mode,
      });
    }
    case "matters":
    case "focus":
    default: {
      const focus = priority.recommendedNextAction ?? ranked[0];
      if (!focus) {
        return buildMetricResponse({
          situation: "Platform operations appear manageable today.",
          risk: "Unreviewed alerts or failed jobs can still escalate quietly.",
          recommendation: "Focus on Platform Status, then scan launch readiness.",
          nextAction: routeLabelToNextAction("/admin/nexus/mission-control"),
          mode: options?.mode,
        });
      }
      return buildMetricResponse({
        situation: `Recommended focus: ${focus.title}.`,
        risk: priority.highestPriorityIssue
          ? `While focusing here, keep ${priority.highestPriorityIssue.title} on your radar.`
          : "No competing critical issue is currently overriding this focus.",
        recommendation: `${focus.reason}${memoryHint ? ` Memory context: ${memoryHint}.` : ""}`,
        nextAction: routeLabelToNextAction(focus.relatedRoute),
        mode: options?.mode,
      });
    }
  }
}

export function formatLaunchReadinessFromMorning(
  briefing: MorningBriefing,
  options?: { mode?: FounderMode; memoryHint?: string | null },
): string {
  return formatLaunchReadinessResponse(briefing.launchReadiness, options);
}
