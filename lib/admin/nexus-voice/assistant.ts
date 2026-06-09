import type { SupabaseClient } from "@supabase/supabase-js";
import { runNexusVoiceTool } from "@/lib/admin/nexus-voice/tools";
import type {
  NexusVoiceActionResult,
  NexusVoiceAssistantResult,
  NexusVoiceToolName,
} from "@/lib/admin/nexus-voice/types";

type ToolPattern = {
  tool: NexusVoiceToolName;
  patterns: RegExp[];
};

const TOOL_PATTERNS: ToolPattern[] = [
  {
    tool: "getBlackcardCount",
    patterns: [
      /\bblack\s*card\b/i,
      /\bfounding\b.*\b(member|members)\b/i,
      /\bget blackcard count\b/i,
    ],
  },
  {
    tool: "getMemberCount",
    patterns: [
      /\b(member|members|user|users)\b.*\b(count|total|how many)\b/i,
      /\bhow many\b.*\b(member|members|users)\b/i,
      /\b(total|count)\b.*\b(member|members|users)\b/i,
      /\bget member count\b/i,
    ],
  },
  {
    tool: "getRecentSignups",
    patterns: [
      /\brecent\b.*\b(sign\s*up|signup|signups|member|members)\b/i,
      /\bnew\b.*\b(member|members|signups?)\b/i,
      /\bget recent signups\b/i,
      /\blatest\b.*\b(signups?|members)\b/i,
    ],
  },
  {
    tool: "getPendingReports",
    patterns: [
      /\bpending\b.*\breports?\b/i,
      /\breports?\b.*\b(pending|queue|moderation)\b/i,
      /\bget pending reports\b/i,
      /\bmoderation\b.*\b(queue|reports?)\b/i,
    ],
  },
  {
    tool: "getRevenueToday",
    patterns: [
      /\brevenue\b/i,
      /\bsales?\b.*\btoday\b/i,
      /\btoday\b.*\b(sales?|revenue|money|orders?)\b/i,
      /\bget revenue today\b/i,
      /\bshop\b.*\b(today|revenue|sales?)\b/i,
    ],
  },
  {
    tool: "getSystemStatus",
    patterns: [
      /\bsystem\b.*\b(status|health)\b/i,
      /\bplatform\b.*\b(status|health)\b/i,
      /\bget system status\b/i,
      /\bhealth check\b/i,
      /\bnexus\b.*\b(status|health)\b/i,
    ],
  },
];

export const NEXUS_VOICE_HELP_RESPONSE =
  "I can report member count, Blackcard count, recent signups, pending reports, revenue today, and system status. Try asking, for example, how many members we have or what revenue looks like today.";

function matchesToolPattern(transcript: string, entry: ToolPattern): boolean {
  if (entry.tool === "getMemberCount" && /\bblack\s*card\b/i.test(transcript)) {
    return false;
  }

  return entry.patterns.some((pattern) => pattern.test(transcript));
}

export function resolveNexusVoiceTool(transcript: string): NexusVoiceToolName | null {
  const normalized = transcript.trim();
  if (!normalized) {
    return null;
  }

  for (const entry of TOOL_PATTERNS) {
    if (matchesToolPattern(normalized, entry)) {
      return entry.tool;
    }
  }

  return null;
}

function formatSignupNames(actionResult: NexusVoiceActionResult): string {
  const signups = actionResult.data.signups;
  if (!Array.isArray(signups) || signups.length === 0) {
    return "No new signups in the last 7 days.";
  }

  const labels = signups.map((entry) => {
    const item = entry as { username?: string | null; displayName?: string | null };
    return item.username || item.displayName || "unknown member";
  });

  return `Recent signups: ${labels.join(", ")}.`;
}

export function formatNexusVoiceResponse(
  tool: NexusVoiceToolName,
  actionResult: NexusVoiceActionResult,
): string {
  switch (tool) {
    case "getMemberCount":
      return `There are ${actionResult.data.count} members on the platform.`;
    case "getBlackcardCount":
      return `There are ${actionResult.data.count} Blackcard members.`;
    case "getRecentSignups":
      return formatSignupNames(actionResult);
    case "getPendingReports":
      return `There are ${actionResult.data.count} pending moderation reports.`;
    case "getRevenueToday": {
      const formatted = String(actionResult.data.formatted ?? "$0.00");
      const orderCount = Number(actionResult.data.orderCount ?? 0);
      return `Revenue today is ${formatted} across ${orderCount} paid order${orderCount === 1 ? "" : "s"}.`;
    }
    case "getSystemStatus": {
      const status = String(actionResult.data.status ?? "unknown");
      return status === "healthy"
        ? "System status is healthy. Core services are responding."
        : "System status is degraded. Review the NEXUS checks for missing or failing services.";
    }
    default:
      return NEXUS_VOICE_HELP_RESPONSE;
  }
}

export async function runNexusVoiceAssistant(
  transcript: string,
  admin: SupabaseClient,
): Promise<NexusVoiceAssistantResult> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return {
      transcript: "",
      response: "I did not catch a command. Tap NEXUS Voice and try again.",
      tool: null,
    };
  }

  const tool = resolveNexusVoiceTool(trimmed);
  if (!tool) {
    return {
      transcript: trimmed,
      response: NEXUS_VOICE_HELP_RESPONSE,
      tool: null,
    };
  }

  const actionResult = await runNexusVoiceTool(tool, admin);

  return {
    transcript: trimmed,
    response: formatNexusVoiceResponse(tool, actionResult),
    actionResult,
    tool,
  };
}
