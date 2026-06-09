import type { NexusVoiceActionResult } from "@/lib/admin/nexus-voice/types";
import type { ExecutivePriority } from "@/lib/executive-command/types";

function partialSuffix(result: NexusVoiceActionResult): string {
  if (!result.partial && !result.warnings?.length) return "";
  const warning = result.warnings?.[0] ?? "Some executive signals may be incomplete.";
  return ` ${warning}`;
}

function formatPriorityLine(priority: ExecutivePriority, index: number): string {
  return `${index + 1}. ${priority.title} (${priority.urgency}). ${priority.suggested_next_action}`;
}

export function formatExecutiveSummaryResponse(result: NexusVoiceActionResult): string {
  const summary = result.data.summary as {
    executive_summary: {
      platform_status_label: string;
      launch_readiness_score: number;
      launch_readiness_status: string;
      recommended_focus_today: string;
      top_risk: { title: string; summary: string } | null;
      top_opportunity: { title: string; summary: string } | null;
    };
  };

  const exec = summary.executive_summary;
  const risk = exec.top_risk
    ? ` Top risk: ${exec.top_risk.title}.`
    : " No major risk flagged today.";
  const opportunity = exec.top_opportunity
    ? ` Top opportunity: ${exec.top_opportunity.title}.`
    : " No standout opportunity flagged today.";

  return `Executive summary: Platform Status is ${exec.platform_status_label}. Launch readiness is ${exec.launch_readiness_score} out of 100 (${exec.launch_readiness_status}). Focus today: ${exec.recommended_focus_today}.${risk}${opportunity}${partialSuffix(result)}`;
}

export function formatExecutivePrioritiesResponse(result: NexusVoiceActionResult): string {
  const priorities = result.data.priorities as ExecutivePriority[];
  const focus = String(result.data.recommended_focus ?? "");

  if (!priorities || priorities.length === 0) {
    return `Today's priorities: No urgent items detected. Recommended focus: ${focus || "review the executive summary."}${partialSuffix(result)}`;
  }

  const lines = priorities.slice(0, 5).map(formatPriorityLine).join(" ");
  return `Today's priorities: ${lines}${partialSuffix(result)}`;
}

export function formatExecutiveBiggestRiskResponse(result: NexusVoiceActionResult): string {
  const risk = result.data.risk as { title: string; summary: string } | null;
  const platformStatus = String(result.data.platform_status ?? "unknown");

  if (!risk) {
    return `No major risk surfaced in today's executive briefing. Platform Status is ${platformStatus}.${partialSuffix(result)}`;
  }

  return `Biggest risk today: ${risk.title}. ${risk.summary} Platform Status is ${platformStatus}.${partialSuffix(result)}`;
}

export function formatExecutiveBiggestOpportunityResponse(result: NexusVoiceActionResult): string {
  const opportunity = result.data.opportunity as { title: string; summary: string } | null;

  if (!opportunity) {
    return `No major opportunity surfaced in today's executive briefing.${partialSuffix(result)}`;
  }

  return `Biggest opportunity today: ${opportunity.title}. ${opportunity.summary}${partialSuffix(result)}`;
}
