import type { FounderBriefing, FounderRecommendations, FounderTimeline } from "@/lib/founder-copilot/types";
import type { FounderQuestionResult } from "@/lib/founder-copilot/questions";
import type { LaunchReadiness, MorningBriefing } from "@/lib/proactive-intelligence/types";
import type { NexusVoiceActionResult } from "@/lib/admin/nexus-voice/types";
import {
  formatFounderBriefingStructured,
  formatMorningBriefingStructured,
  formatPriorityGuidance,
  formatRecommendationsStructured,
} from "@/lib/founder-personality/briefing";
import { buildMetricResponse } from "@/lib/founder-personality/formatter";
import { formatLaunchReadinessResponse } from "@/lib/founder-personality/launch-summary";
import { normalizeFounderMode } from "@/lib/founder-personality/modes";
import type { FounderMode } from "@/lib/founder-personality/types";
import type { FounderPriorityEngine } from "@/lib/proactive-intelligence/types";

export type FounderFormatOptions = {
  founderMode?: FounderMode;
};

function partialSuffix(result: NexusVoiceActionResult): string {
  if (!result.partial && !result.warnings?.length) return "";
  const warning = result.warnings?.[0] ?? "Some founder data may be incomplete.";
  return ` ${warning}`;
}

function memoryHintsFromResult(actionResult: NexusVoiceActionResult): string[] {
  const hints = actionResult.data.memoryHints;
  return Array.isArray(hints) ? (hints as string[]) : [];
}

function modeFromOptions(options?: FounderFormatOptions): FounderMode {
  return normalizeFounderMode(options?.founderMode);
}

export function formatMorningBriefingResponse(
  actionResult: NexusVoiceActionResult,
  options?: FounderFormatOptions,
): string {
  const briefing = actionResult.data.morningBriefing as MorningBriefing | undefined;
  if (!briefing) {
    return "I could not compile the morning briefing right now.";
  }

  const mode = modeFromOptions(options);
  const structured = formatMorningBriefingStructured(briefing, {
    mode,
    memoryHints: memoryHintsFromResult(actionResult),
  });

  return `${structured}${partialSuffix(actionResult)}`;
}

export function formatFounderBriefingResponse(
  actionResult: NexusVoiceActionResult,
  options?: FounderFormatOptions,
): string {
  const briefing = actionResult.data.briefing as FounderBriefing | undefined;
  if (!briefing) {
    return "I could not compile a founder briefing right now.";
  }

  const mode = modeFromOptions(options);
  const structured = formatFounderBriefingStructured(briefing, {
    mode,
    memoryHints: memoryHintsFromResult(actionResult),
  });

  return `${structured}${partialSuffix(actionResult)}`;
}

export function formatFounderRecommendationsResponse(
  actionResult: NexusVoiceActionResult,
  options?: FounderFormatOptions,
): string {
  const recommendations = actionResult.data.recommendations as FounderRecommendations | undefined;
  const mode = modeFromOptions(options);

  if (!recommendations) {
    return `No urgent founder recommendations right now.${partialSuffix(actionResult)}`;
  }

  const structured = formatRecommendationsStructured(recommendations, {
    mode,
    memoryHints: memoryHintsFromResult(actionResult),
  });

  return `${structured}${partialSuffix(actionResult)}`;
}

export function formatFounderTimelineResponse(
  actionResult: NexusVoiceActionResult,
  options?: FounderFormatOptions,
): string {
  const timeline = actionResult.data.timeline as FounderTimeline | undefined;
  if (!timeline) {
    return "I could not load the founder timeline right now.";
  }

  const mode = modeFromOptions(options);
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
      ? timeline.nextActions.slice(0, 2).join("; ")
      : "Review Platform Status for the latest operational signals.";

  const structured = buildMetricResponse({
    situation: `Recent wins: ${accomplishments}. Current blockers: ${blockers}.`,
    risk:
      timeline.currentBlockers.length > 0
        ? "Unresolved blockers can slow launch readiness and member experience."
        : "Timeline is clear, but unreviewed Platform Health signals can still surface issues.",
    recommendation: `Next priorities: ${next}.`,
    nextAction: "Open Founder Copilot for the full timeline.",
    mode,
  });

  return `${structured}${partialSuffix(actionResult)}`;
}

export function formatFounderQuestionResponse(
  actionResult: NexusVoiceActionResult,
  options?: FounderFormatOptions,
): string {
  const result = actionResult.data as FounderQuestionResult | undefined;
  if (!result) {
    return "I could not answer that founder question right now.";
  }

  const mode = modeFromOptions(options);
  const memoryHints = memoryHintsFromResult(actionResult);

  switch (result.questionType) {
    case "platform_health":
      return formatFounderBriefingResponse(
        {
          ...actionResult,
          data: { briefing: result.data.briefing, memoryHints },
        },
        options,
      );
    case "changed_today": {
      const timeline = result.data.timeline as FounderTimeline;
      const changes = [...timeline.recentAccomplishments, ...timeline.recentDecisions]
        .slice(0, 4)
        .map((entry) => entry.title);
      const blockerText =
        timeline.currentBlockers.length > 0
          ? timeline.currentBlockers
              .slice(0, 2)
              .map((entry) => entry.title)
              .join("; ")
          : "none flagged";

      if (changes.length === 0) {
        return buildMetricResponse({
          situation: "Nothing major changed today in memory or platform signals.",
          risk: "Quiet days can hide emerging Platform Health drift.",
          recommendation: "Review Platform Status for live health and failed jobs.",
          nextAction: "Open Platform Status.",
          mode,
        });
      }

      return buildMetricResponse({
        situation: `What changed today: ${changes.join("; ")}.`,
        risk: `Active blockers: ${blockerText}.`,
        recommendation: "Use timeline context to decide whether to intervene or stay the course.",
        nextAction: "Open Founder Copilot timeline.",
        mode,
      });
    }
    case "launch_blockers": {
      const blockers = result.data.launchBlockers as string[];
      if (!blockers || blockers.length === 0) {
        return buildMetricResponse({
          situation: "No major launch blockers detected from alerts, incidents, jobs, or reports.",
          risk: "Remaining validation gaps may still surface during a broader launch push.",
          recommendation: "Confirm launch readiness score and at-risk systems before expanding scope.",
          nextAction: "Open Platform Status.",
          mode,
        });
      }
      return buildMetricResponse({
        situation: `Launch blockers: ${blockers.join("; ")}.`,
        risk: "Unresolved blockers can delay launch confidence and member trust.",
        recommendation: "Resolve the highest-severity blocker before lower-priority growth work.",
        nextAction: "Open Platform Status and clear failed jobs or alerts.",
        mode,
      });
    }
    case "launch_readiness": {
      const launchReadiness = result.data.launchReadiness as LaunchReadiness;
      if (!launchReadiness) {
        return "I could not compute launch readiness right now.";
      }
      return formatLaunchReadinessResponse(launchReadiness, {
        mode,
        memoryHint: memoryHints[0] ?? null,
      });
    }
    case "biggest_risk": {
      const priority = result.data.priority as FounderPriorityEngine | undefined;
      if (priority) {
        return formatPriorityGuidance(priority, {
          mode,
          memoryHints,
          question: "risk",
        });
      }
      const topRisk = result.data.topRisk as { title: string; reason: string } | null;
      if (!topRisk) {
        return buildMetricResponse({
          situation: "No major risk signal is standing above the rest right now.",
          risk: "Hidden operational drift is still possible without daily Platform Status review.",
          recommendation: "Scan alerts, failed jobs, and incidents once today.",
          nextAction: "Open Alerts.",
          mode,
        });
      }
      return buildMetricResponse({
        situation: `Biggest risk: ${topRisk.title}.`,
        risk: topRisk.reason,
        recommendation: `Address ${topRisk.title} before lower-priority growth work.`,
        nextAction: "Open Platform Status.",
        mode,
      });
    }
    case "biggest_opportunity": {
      const priority = result.data.priority as FounderPriorityEngine | undefined;
      if (priority) {
        return formatPriorityGuidance(priority, {
          mode,
          memoryHints,
          question: "opportunity",
        });
      }
      return buildMetricResponse({
        situation: "No standout opportunity is elevated above baseline operations.",
        risk: "Under-investing in growth while platform is stable can slow momentum.",
        recommendation: "Review member growth, Blackcard conversion, and revenue signals.",
        nextAction: "Open Founder Copilot.",
        mode,
      });
    }
    case "focus_today":
    case "matters_today": {
      const priority = result.data.priority as FounderPriorityEngine | undefined;
      if (priority) {
        return formatPriorityGuidance(priority, {
          mode,
          memoryHints,
          question: options?.founderMode === "launch" ? "focus" : "matters",
        });
      }
      const focus = result.data.focus as Array<{ title: string; reason: string }> | undefined;
      if (!focus || focus.length === 0) {
        return buildMetricResponse({
          situation: "Platform operations appear manageable today.",
          risk: "Unreviewed alerts or failed jobs can still escalate quietly.",
          recommendation: "Focus on Platform Status, then scan launch readiness.",
          nextAction: "Open Platform Status.",
          mode,
        });
      }
      return buildMetricResponse({
        situation: `Recommended focus: ${focus.map((item) => item.title).join("; ")}.`,
        risk: focus[0]?.reason ?? "Operational drift can compound if ignored.",
        recommendation: focus.map((item) => `${item.title} — ${item.reason}`).join("; "),
        nextAction: "Open Founder Copilot.",
        mode,
      });
    }
    case "next_steps":
    case "general": {
      const recommendations = result.data.recommendations as FounderRecommendations;
      return formatFounderRecommendationsResponse(
        {
          ...actionResult,
          data: { recommendations, memoryHints },
        },
        options,
      );
    }
  }
}
