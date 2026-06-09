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
      const timeline = await getFounderTimeline(admin);
      return { questionType, data: { timeline } };
    }
    case "launch_blockers": {
      const recommendations = await getFounderRecommendations(admin);
      return {
        questionType,
        data: { launchBlockers: recommendations.launchBlockers, recommendations },
      };
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
