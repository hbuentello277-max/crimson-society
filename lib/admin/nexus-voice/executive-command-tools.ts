import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatExecutiveSummaryForVoice,
  getExecutiveCommandSummary,
} from "@/lib/executive-command/engine";
import type { NexusVoiceActionResult } from "@/lib/admin/nexus-voice/types";

export async function runNexusExecutiveCommandVoiceTool(
  tool:
    | "getExecutiveCommandSummary"
    | "getExecutiveCommandPriorities"
    | "getExecutiveCommandApprovals"
    | "getExecutiveCommandTopRisk"
    | "getExecutiveCommandTopOpportunity",
  admin: SupabaseClient,
): Promise<NexusVoiceActionResult> {
  const summary = await getExecutiveCommandSummary(admin, "owner");

  if (tool === "getExecutiveCommandSummary") {
    return {
      tool,
      data: {
        spoken: formatExecutiveSummaryForVoice(summary),
        focus: summary.executive_summary.recommended_focus_today,
      },
    };
  }

  if (tool === "getExecutiveCommandPriorities") {
    return {
      tool,
      data: {
        priorities: summary.todays_priorities.map((item) => ({
          title: item.title,
          urgency: item.urgency,
          reason: item.reason,
          next: item.suggested_next_action,
        })),
      },
    };
  }

  if (tool === "getExecutiveCommandApprovals") {
    return {
      tool,
      data: {
        pending_approval: summary.action_center.pending_approval,
        draft: summary.action_center.draft,
        approved: summary.action_center.approved_awaiting_execution,
        recent_titles: summary.action_center.recent_titles,
      },
    };
  }

  if (tool === "getExecutiveCommandTopRisk") {
    return {
      tool,
      data: {
        title: summary.executive_summary.top_risk,
        priorities: summary.todays_priorities
          .filter((item) => item.urgency === "critical" || item.urgency === "high")
          .slice(0, 2)
          .map((item) => item.title),
      },
    };
  }

  return {
    tool,
    data: {
      title: summary.executive_summary.top_opportunity,
      opportunities: summary.todays_priorities
        .filter((item) => item.id.includes("opportunity"))
        .slice(0, 2)
        .map((item) => item.title),
    },
  };
}
