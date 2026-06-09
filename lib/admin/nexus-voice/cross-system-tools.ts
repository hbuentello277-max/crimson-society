import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCrossSystemOpportunitiesPayload,
  getCrossSystemRisksPayload,
  getFounderIntelligenceBriefingPayload,
  getCrossSystemTimeline,
} from "@/lib/cross-system-intelligence/engine";
import type { NexusVoiceActionResult } from "@/lib/admin/nexus-voice/types";

export async function runNexusCrossSystemVoiceTool(
  tool:
    | "getPlatformIntelligenceBriefing"
    | "getPlatformIntelligenceTimeline"
    | "getPlatformIntelligenceRisks"
    | "getPlatformIntelligenceOpportunities",
  admin: SupabaseClient,
): Promise<NexusVoiceActionResult> {
  if (tool === "getPlatformIntelligenceBriefing") {
    const briefing = await getFounderIntelligenceBriefingPayload(admin);
    return {
      tool,
      data: {
        headline: briefing.headline,
        narrative: briefing.narrative,
        top_risks: briefing.top_risks.slice(0, 3).map((risk) => risk.title),
        top_opportunities: briefing.top_opportunities.slice(0, 3).map((item) => item.title),
        recommended_actions: briefing.recommended_actions.slice(0, 3).map((item) => item.title),
      },
    };
  }

  if (tool === "getPlatformIntelligenceTimeline") {
    const timeline = await getCrossSystemTimeline(admin, "7d");
    return {
      tool,
      data: {
        events: timeline.events.slice(0, 6).map((event) => ({
          title: event.title,
          summary: event.summary,
          occurred_at: event.occurred_at,
        })),
      },
    };
  }

  if (tool === "getPlatformIntelligenceRisks") {
    const payload = await getCrossSystemRisksPayload(admin);
    return {
      tool,
      data: {
        risks: payload.risks.slice(0, 5).map((risk) => ({
          title: risk.title,
          summary: risk.summary,
        })),
      },
    };
  }

  const payload = await getCrossSystemOpportunitiesPayload(admin);
  return {
    tool,
    data: {
      opportunities: payload.opportunities.slice(0, 5).map((item) => ({
        title: item.title,
        summary: item.summary,
      })),
    },
  };
}
