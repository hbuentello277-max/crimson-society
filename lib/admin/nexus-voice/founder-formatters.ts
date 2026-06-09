import type { FounderBriefing, FounderRecommendations, FounderTimeline } from "@/lib/founder-copilot/types";
import type { LaunchReadiness, MorningBriefing } from "@/lib/proactive-intelligence/types";
import type { FounderQuestionResult } from "@/lib/founder-copilot/questions";
import type { NexusVoiceActionResult } from "@/lib/admin/nexus-voice/types";

function partialSuffix(result: NexusVoiceActionResult): string {
  if (!result.partial && !result.warnings?.length) return "";
  const warning = result.warnings?.[0] ?? "Some founder data may be incomplete.";
  return ` ${warning}`;
}

export function formatMorningBriefingResponse(actionResult: NexusVoiceActionResult): string {
  const briefing = actionResult.data.morningBriefing as MorningBriefing | undefined;
  if (!briefing) {
    return "I could not compile the morning briefing right now.";
  }

  const sections = briefing.sections
    .slice(0, 4)
    .map((section) => `${section.label}: ${section.value}`)
    .join("; ");

  const alerts =
    briefing.proactiveAlerts.length > 0
      ? ` Proactive alerts: ${briefing.proactiveAlerts
          .slice(0, 2)
          .map((alert) => alert.title)
          .join("; ")}.`
      : "";

  const launch = ` Launch readiness: ${briefing.launchReadiness.score}/100 (${briefing.launchReadiness.status}).`;

  return `Morning briefing: ${briefing.headline} ${sections}.${alerts}${launch}${partialSuffix(actionResult)}`;
}

export function formatFounderBriefingResponse(
  actionResult: NexusVoiceActionResult,
): string {
  const briefing = actionResult.data.briefing as FounderBriefing | undefined;
  if (!briefing) {
    return "I could not compile a founder briefing right now.";
  }

  const members = briefing.membershipGrowth.newUsersThisWeek ?? briefing.membershipGrowth.totalUsers;
  const blackcard = briefing.blackcardGrowth.activeMembers;
  const alerts = briefing.openAlerts.critical;
  const jobs = briefing.failedPlatformJobs.failedCount;
  const reports = briefing.pendingReports;
  const actions =
    briefing.recommendedActions.length > 0
      ? ` Recommended: ${briefing.recommendedActions.slice(0, 2).join("; ")}.`
      : "";

  return `Founder briefing: Platform is ${briefing.platformHealth.status}. Platform Health score ${briefing.platformHealth.missionScore ?? "n/a"}. Membership growth this week: ${members ?? "n/a"}. Blackcard members: ${blackcard ?? "n/a"}. Revenue today: ${briefing.revenueSummary.revenueToday ?? "n/a"}. Open critical alerts: ${alerts}. Failed platform jobs: ${jobs}. Pending reports: ${reports}.${actions}${partialSuffix(actionResult)}`;
}

export function formatFounderRecommendationsResponse(
  actionResult: NexusVoiceActionResult,
): string {
  const recommendations = actionResult.data.recommendations as FounderRecommendations | undefined;
  if (!recommendations || recommendations.recommendations.length === 0) {
    return `No urgent founder recommendations right now.${partialSuffix(actionResult)}`;
  }

  const top = recommendations.recommendations
    .slice(0, 3)
    .map((item) => item.title)
    .join("; ");

  const risk = recommendations.topRisk ? ` Top risk: ${recommendations.topRisk}.` : "";

  return `Founder recommendations: ${top}.${risk}${partialSuffix(actionResult)}`;
}

export function formatFounderTimelineResponse(actionResult: NexusVoiceActionResult): string {
  const timeline = actionResult.data.timeline as FounderTimeline | undefined;
  if (!timeline) {
    return "I could not load the founder timeline right now.";
  }

  const accomplishments =
    timeline.recentAccomplishments.length > 0
      ? timeline.recentAccomplishments
          .slice(0, 2)
          .map((entry) => entry.title)
          .join("; ")
      : "No recent accomplishments logged";

  const blockers =
    timeline.currentBlockers.length > 0
      ? timeline.currentBlockers
          .slice(0, 2)
          .map((entry) => entry.title)
          .join("; ")
      : "No active blockers";

  const next =
    timeline.nextActions.length > 0
      ? ` Next: ${timeline.nextActions.slice(0, 2).join("; ")}.`
      : "";

  return `Founder timeline: Recent wins — ${accomplishments}. Blockers — ${blockers}.${next}`;
}

export function formatFounderQuestionResponse(actionResult: NexusVoiceActionResult): string {
  const result = actionResult.data as FounderQuestionResult | undefined;
  if (!result) {
    return "I could not answer that founder question right now.";
  }

  switch (result.questionType) {
    case "platform_health":
      return formatFounderBriefingResponse({
        ...actionResult,
        data: { briefing: result.data.briefing },
      });
    case "changed_today": {
      const timeline = result.data.timeline as FounderTimeline;
      const changes = [
        ...timeline.recentAccomplishments,
        ...timeline.recentDecisions,
      ]
        .slice(0, 4)
        .map((entry) => entry.title);
      if (changes.length === 0) {
        return "Nothing major changed today in memory or platform signals. Review Platform Status for live health.";
      }
      return `What changed today: ${changes.join("; ")}. Blockers: ${
        timeline.currentBlockers.length > 0
          ? timeline.currentBlockers
              .slice(0, 2)
              .map((entry) => entry.title)
              .join("; ")
          : "none flagged"
      }.`;
    }
    case "launch_blockers": {
      const blockers = result.data.launchBlockers as string[];
      if (!blockers || blockers.length === 0) {
        return "No major launch blockers detected from alerts, incidents, jobs, or reports.";
      }
      return `Launch blockers: ${blockers.join("; ")}.`;
    }
    case "launch_readiness": {
      const launchReadiness = result.data.launchReadiness as LaunchReadiness;
      if (!launchReadiness) {
        return "I could not compute launch readiness right now.";
      }
      const blockers =
        launchReadiness.blockers.length > 0
          ? ` Blockers: ${launchReadiness.blockers.slice(0, 3).join("; ")}.`
          : " No major blockers detected.";
      return `Launch readiness score: ${launchReadiness.score} out of 100 (${launchReadiness.status}). ${launchReadiness.summary}${blockers}`;
    }
    case "biggest_risk": {
      const topRisk = result.data.topRisk as { title: string; reason: string } | null;
      if (!topRisk) {
        return "No major risk signal is standing above the rest right now.";
      }
      return `Biggest risk: ${topRisk.title}. ${topRisk.reason}`;
    }
    case "focus_today": {
      const focus = result.data.focus as Array<{ title: string; reason: string }>;
      const priority = result.data.priority as
        | { recommendedNextAction?: { title: string; reason: string } | null }
        | undefined;
      if (priority?.recommendedNextAction) {
        return `What to focus on: ${priority.recommendedNextAction.title}. ${priority.recommendedNextAction.reason}`;
      }
      if (!focus || focus.length === 0) {
        return "Focus today on maintaining platform stability and reviewing Platform Status.";
      }
      return `Focus today: ${focus.map((item) => `${item.title} (${item.reason})`).join("; ")}.`;
    }
    case "next_steps":
    case "general": {
      const recommendations = result.data.recommendations as FounderRecommendations;
      const steps = recommendations.recommendations.slice(0, 3).map((item) => item.title);
      if (steps.length === 0) {
        return "Next step: review Platform Status and clear any open alerts.";
      }
      return `What to do next: ${steps.join("; ")}.`;
    }
  }
}
