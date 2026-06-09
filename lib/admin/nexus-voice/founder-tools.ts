import type { SupabaseClient } from "@supabase/supabase-js";
import { getFounderBriefing } from "@/lib/founder-copilot/briefing";
import { answerFounderQuestion } from "@/lib/founder-copilot/questions";
import { getFounderRecommendations } from "@/lib/founder-copilot/recommendations";
import { getFounderTimeline } from "@/lib/founder-copilot/timeline";
import type { NexusVoiceActionResult, NexusVoiceFounderToolName } from "@/lib/admin/nexus-voice/types";

export async function runNexusVoiceFounderTool(
  tool: NexusVoiceFounderToolName,
  admin: SupabaseClient,
  options?: { transcript?: string },
): Promise<NexusVoiceActionResult> {
  switch (tool) {
    case "getFounderBriefing": {
      const briefing = await getFounderBriefing(admin);
      return {
        tool,
        data: { briefing },
        partial: briefing.partial,
        warnings: briefing.warnings,
      };
    }
    case "getFounderRecommendations": {
      const recommendations = await getFounderRecommendations(admin);
      return {
        tool,
        data: { recommendations },
        partial: recommendations.partial,
        warnings: recommendations.warnings,
      };
    }
    case "getFounderTimeline": {
      const timeline = await getFounderTimeline(admin);
      return {
        tool,
        data: { timeline },
      };
    }
    case "answerFounderQuestion": {
      const transcript = options?.transcript?.trim() ?? "";
      const result = await answerFounderQuestion(admin, transcript);
      return {
        tool,
        data: result,
      };
    }
    default:
      throw new Error(`Unknown founder tool: ${tool}`);
  }
}
