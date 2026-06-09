import type { FounderMode, FounderStructuredResponse } from "@/lib/founder-personality/types";
import { modeLensLabel } from "@/lib/founder-personality/modes";

export function formatFounderStructuredResponse(
  response: FounderStructuredResponse,
  options?: { channel?: "voice" | "ui"; mode?: FounderMode },
): string {
  const channel = options?.channel ?? "voice";
  const mode = options?.mode ?? "founder";
  const lens = modeLensLabel(mode);

  const confidence = response.confidence ? ` Confidence: ${response.confidence}.` : "";
  const impact = response.impact ? ` Impact: ${response.impact}.` : "";

  if (channel === "ui") {
    return [
      `Situation:\n${response.situation}`,
      `Risk:\n${response.risk}`,
      `Recommendation:\n${response.recommendation}`,
      `Next Action:\n${response.nextAction}`,
      response.confidence ? `Confidence:\n${response.confidence}` : null,
      response.impact ? `Impact:\n${response.impact}` : null,
      `Lens: ${lens}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return `Situation: ${response.situation} Risk: ${response.risk} Recommendation: ${response.recommendation} Next action: ${response.nextAction}.${confidence}${impact}`;
}

export function buildMetricResponse(input: {
  situation: string;
  risk: string;
  recommendation: string;
  nextAction: string;
  confidence?: string;
  impact?: string;
  memoryHint?: string | null;
  mode?: FounderMode;
  channel?: "voice" | "ui";
}): string {
  const recommendation = input.memoryHint
    ? `${input.recommendation} Memory context: ${input.memoryHint}.`
    : input.recommendation;

  return formatFounderStructuredResponse(
    {
      situation: input.situation,
      risk: input.risk,
      recommendation,
      nextAction: input.nextAction,
      confidence: input.confidence,
      impact: input.impact,
    },
    { channel: input.channel ?? "voice", mode: input.mode },
  );
}

export function routeLabelToNextAction(route?: string | null, fallback = "Open Platform Status"): string {
  if (!route) {
    return fallback;
  }

  if (route.includes("mission-control")) {
    return "Open Platform Status.";
  }
  if (route.includes("mission-health")) {
    return "Open Platform Health.";
  }
  if (route.includes("alerts")) {
    return "Open Alerts.";
  }
  if (route.includes("metrics")) {
    return "Open Metrics.";
  }
  if (route.includes("copilot")) {
    return "Open Founder Copilot.";
  }

  return `Open ${route.replace("/admin/nexus/", "").replace(/-/g, " ")}.`;
}
