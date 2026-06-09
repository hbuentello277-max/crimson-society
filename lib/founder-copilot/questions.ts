import type { SupabaseClient } from "@supabase/supabase-js";
import { getFounderBriefing } from "@/lib/founder-copilot/briefing";
import {
  getFocusRecommendations,
  getFounderRecommendations,
  getTopRiskRecommendation,
} from "@/lib/founder-copilot/recommendations";
import { getFounderTimeline } from "@/lib/founder-copilot/timeline";
import { computeLaunchReadiness } from "@/lib/proactive-intelligence/launch-readiness";
import { buildFounderPriorityEngine } from "@/lib/proactive-intelligence/priority-engine";
import { detectProactiveAlerts } from "@/lib/proactive-intelligence/proactive-alerts";
import { getRelevantMemoryContext, retrieveFounderMemory } from "@/lib/memory/retrieval";
import type { FounderQuestionType } from "@/lib/founder-copilot/types";

export type FounderQuestionResult = {
  questionType: FounderQuestionType;
  data: Record<string, unknown>;
};

export function resolveFounderQuestionType(transcript: string): FounderQuestionType | null {
  const normalized = transcript.trim().toLowerCase();
  if (!normalized) return null;

  if (/\bwhat should i focus on(?: today)?\b/i.test(normalized)) return "focus_today";
  if (/\bwhat is blocking launch\b/i.test(normalized)) return "launch_blockers";
  if (/\bare we launch ready\b/i.test(normalized)) return "launch_readiness";
  if (/\bwhat changed today\b/i.test(normalized)) return "changed_today";
  if (/\bwhat is (?:the )?my biggest risk\b/i.test(normalized)) return "biggest_risk";
  if (/\bwhat is the biggest risk\b/i.test(normalized)) return "biggest_risk";
  if (/\bhow healthy is crimson society\b/i.test(normalized)) return "platform_health";
  if (/\bwhat should i do next\b/i.test(normalized)) return "next_steps";
  if (/\bwhat phase are we on\b/i.test(normalized)) return "phase_status";
  if (/\bwhat did we finish this week\b/i.test(normalized)) return "completed_this_week";
  if (/\bsummarize founder memory\b/i.test(normalized)) return "memory_summary";

  return null;
}

export async function answerFounderQuestion(
  admin: SupabaseClient,
  transcript: string,
): Promise<FounderQuestionResult> {
  const questionType = resolveFounderQuestionType(transcript) ?? "general";

  switch (questionType) {
    case "platform_health": {
      const briefing = await getFounderBriefing(admin);
      return { questionType, data: { briefing } };
    }
    case "changed_today": {
      const [timeline, memoryContext] = await Promise.all([
        getFounderTimeline(admin),
        getRelevantMemoryContext(admin),
      ]);
      return { questionType, data: { timeline, memoryContext } };
    }
    case "launch_blockers": {
      const [recommendations, memory] = await Promise.all([
        getFounderRecommendations(admin),
        retrieveFounderMemory(admin, transcript, "launch_blockers"),
      ]);
      return {
        questionType,
        data: {
          launchBlockers: recommendations.launchBlockers,
          recommendations,
          memoryBlockers: memory.memoryEntries,
          memoryAnswer: memory.answer,
        },
      };
    }
    case "phase_status": {
      const memory = await retrieveFounderMemory(admin, transcript, "phase_status");
      return { questionType, data: { memory } };
    }
    case "completed_this_week": {
      const memory = await retrieveFounderMemory(admin, transcript, "completed_this_week");
      return { questionType, data: { memory } };
    }
    case "memory_summary": {
      const memory = await retrieveFounderMemory(admin, transcript, "summarize_memory");
      return { questionType, data: { memory } };
    }
    case "launch_readiness": {
      const launchReadiness = await computeLaunchReadiness(admin);
      return { questionType, data: { launchReadiness } };
    }
    case "biggest_risk": {
      const recommendations = await getFounderRecommendations(admin);
      return {
        questionType,
        data: { topRisk: getTopRiskRecommendation(recommendations), recommendations },
      };
    }
    case "focus_today": {
      const [recommendations, proactive] = await Promise.all([
        getFounderRecommendations(admin),
        detectProactiveAlerts(admin),
      ]);
      const priority = await buildFounderPriorityEngine(admin, proactive.alerts);
      return {
        questionType,
        data: {
          focus: getFocusRecommendations(recommendations),
          recommendations,
          priority,
        },
      };
    }
    case "next_steps":
    case "general": {
      const recommendations = await getFounderRecommendations(admin);
      return { questionType, data: { recommendations } };
    }
  }
}
