import type { SupabaseClient } from "@supabase/supabase-js";
import { getExecutiveCommandSummary } from "@/lib/executive-command/engine";
import type {
  NexusVoiceActionResult,
  NexusVoiceExecutiveToolName,
} from "@/lib/admin/nexus-voice/types";

export async function runNexusVoiceExecutiveTool(
  tool: NexusVoiceExecutiveToolName,
  admin: SupabaseClient,
): Promise<NexusVoiceActionResult> {
  const summary = await getExecutiveCommandSummary(admin);

  switch (tool) {
    case "getExecutiveSummary":
      return {
        tool,
        data: { summary },
        partial: summary.partial,
        warnings: summary.warnings,
      };
    case "getExecutivePriorities":
      return {
        tool,
        data: {
          priorities: summary.todays_priorities,
          recommended_focus: summary.executive_summary.recommended_focus_today,
        },
        partial: summary.partial,
        warnings: summary.warnings,
      };
    case "getExecutiveBiggestRisk":
      return {
        tool,
        data: {
          risk: summary.executive_summary.top_risk,
          platform_status: summary.executive_summary.platform_status_label,
        },
        partial: summary.partial,
        warnings: summary.warnings,
      };
    case "getExecutiveBiggestOpportunity":
      return {
        tool,
        data: {
          opportunity: summary.executive_summary.top_opportunity,
        },
        partial: summary.partial,
        warnings: summary.warnings,
      };
    default:
      throw new Error(`Unknown executive tool: ${tool}`);
  }
}
