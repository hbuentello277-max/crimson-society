import type { SupabaseClient } from "@supabase/supabase-js";
import { getFounderBriefing } from "@/lib/founder-copilot/briefing";
import { generateMorningBriefing } from "@/lib/proactive-intelligence/morning-briefing";
import { answerFounderQuestion, resolveFounderQuestionType } from "@/lib/founder-copilot/questions";
import { getFounderRecommendations } from "@/lib/founder-copilot/recommendations";
import { getFounderTimeline } from "@/lib/founder-copilot/timeline";
import type { NexusVoiceActionResult, NexusVoiceFounderToolName } from "@/lib/admin/nexus-voice/types";
import {
  getFounderMemoryHints,
  type FounderMemoryTopic,
} from "@/lib/founder-personality/memory-context";
import { normalizeFounderMode } from "@/lib/founder-personality/modes";
import type { FounderMode } from "@/lib/founder-personality/types";

function memoryTopicForTool(
  tool: NexusVoiceFounderToolName,
  transcript?: string,
  founderMode?: FounderMode,
): FounderMemoryTopic {
  const mode = normalizeFounderMode(founderMode);

  if (mode === "growth") {
    return "growth";
  }
  if (mode === "launch") {
    return "launch";
  }
  if (mode === "operator") {
    return "general";
  }

  if (tool === "getFounderRecommendations") {
    return "monetization";
  }

  if (tool === "answerFounderQuestion" && transcript) {
    const questionType = resolveFounderQuestionType(transcript);
    if (questionType === "launch_readiness" || questionType === "launch_blockers") {
      return "launch";
    }
    if (
      questionType === "biggest_opportunity" ||
      questionType === "focus_today" ||
      questionType === "matters_today" ||
      questionType === "next_steps"
    ) {
      return "growth";
    }
    if (questionType === "platform_health" || questionType === "biggest_risk") {
      return "general";
    }
  }

  return "general";
}

async function withMemoryHints(
  admin: SupabaseClient,
  tool: NexusVoiceFounderToolName,
  result: NexusVoiceActionResult,
  options?: { transcript?: string; founderMode?: FounderMode },
): Promise<NexusVoiceActionResult> {
  const topic = memoryTopicForTool(tool, options?.transcript, options?.founderMode);
  const memoryHints = await getFounderMemoryHints(admin, topic);

  return {
    ...result,
    data: {
      ...result.data,
      memoryHints,
    },
  };
}

export async function runNexusVoiceFounderTool(
  tool: NexusVoiceFounderToolName,
  admin: SupabaseClient,
  options?: { transcript?: string; founderMode?: FounderMode },
): Promise<NexusVoiceActionResult> {
  switch (tool) {
    case "getFounderBriefing": {
      const briefing = await getFounderBriefing(admin);
      return withMemoryHints(
        admin,
        tool,
        {
          tool,
          data: { briefing },
          partial: briefing.partial,
          warnings: briefing.warnings,
        },
        options,
      );
    }
    case "getMorningBriefing": {
      const morningBriefing = await generateMorningBriefing(admin);
      return withMemoryHints(
        admin,
        tool,
        {
          tool,
          data: { morningBriefing },
          partial: morningBriefing.partial,
          warnings: morningBriefing.warnings,
        },
        options,
      );
    }
    case "getFounderRecommendations": {
      const recommendations = await getFounderRecommendations(admin);
      return withMemoryHints(
        admin,
        tool,
        {
          tool,
          data: { recommendations },
          partial: recommendations.partial,
          warnings: recommendations.warnings,
        },
        options,
      );
    }
    case "getFounderTimeline": {
      const timeline = await getFounderTimeline(admin);
      return withMemoryHints(
        admin,
        tool,
        {
          tool,
          data: { timeline },
        },
        options,
      );
    }
    case "answerFounderQuestion": {
      const transcript = options?.transcript?.trim() ?? "";
      const result = await answerFounderQuestion(admin, transcript);
      return withMemoryHints(
        admin,
        tool,
        {
          tool,
          data: result,
        },
        options,
      );
    }
    default:
      throw new Error(`Unknown founder tool: ${tool}`);
  }
}
