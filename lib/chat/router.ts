import type { ChatIntent, ChatMode, ChatRouteResult } from "@/lib/chat/types";
import { normalizeChatMessage } from "@/lib/chat/prompts";

type IntentPattern = {
  intent: ChatIntent;
  mode: ChatMode;
  patterns: RegExp[];
  weight: number;
};

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "attention_today",
    mode: "status",
    weight: 10,
    patterns: [
      /attention today/,
      /deserves attention/,
      /needs my attention/,
      /what('s| is) important/,
      /focus today/,
    ],
  },
  {
    intent: "biggest_risk",
    mode: "risk",
    weight: 10,
    patterns: [/biggest risk/, /top risk/, /largest risk/, /highest risk/, /main risk/],
  },
  {
    intent: "biggest_opportunity",
    mode: "strategy",
    weight: 10,
    patterns: [
      /biggest opportunity/,
      /top opportunity/,
      /best opportunity/,
      /largest opportunity/,
    ],
  },
  {
    intent: "weekly_summary",
    mode: "status",
    weight: 9,
    patterns: [
      /summarize.*week/,
      /summary.*week/,
      /this week('s)? activity/,
      /weekly summary/,
      /week in review/,
    ],
  },
  {
    intent: "changes_since_last_week",
    mode: "status",
    weight: 9,
    patterns: [/what changed/, /changed since/, /since last week/, /week over week/],
  },
  {
    intent: "blackcard_performance",
    mode: "growth",
    weight: 10,
    patterns: [/blackcard/, /black card/],
  },
  {
    intent: "mission_score",
    mode: "status",
    weight: 10,
    patterns: [/mission score/, /why.*score.*down/, /score down/, /score breakdown/],
  },
  {
    intent: "nexus_recommendation",
    mode: "strategy",
    weight: 9,
    patterns: [
      /nexus recommend/,
      /what does nexus recommend/,
      /nexus recommendation/,
      /best decision/,
    ],
  },
  {
    intent: "mission_summary",
    mode: "status",
    weight: 9,
    patterns: [/mission summary/, /mission status/, /mission control summary/],
  },
  {
    intent: "growth_forecast",
    mode: "growth",
    weight: 9,
    patterns: [/growth forecast/, /growth trend/, /member forecast/, /membership forecast/],
  },
  {
    intent: "revenue_forecast",
    mode: "growth",
    weight: 9,
    patterns: [/revenue forecast/, /mrr forecast/, /arr forecast/],
  },
  {
    intent: "recommended_focus",
    mode: "strategy",
    weight: 9,
    patterns: [/recommended focus/, /what should i focus/, /primary focus/, /best focus/],
  },
  {
    intent: "open_incidents",
    mode: "risk",
    weight: 9,
    patterns: [
      /open incidents/,
      /active incidents/,
      /critical alerts/,
      /open alerts/,
      /any incidents/,
    ],
  },
  {
    intent: "best_scenario",
    mode: "strategy",
    weight: 9,
    patterns: [/best scenario/, /favored scenario/, /strongest scenario/, /nexus favored/],
  },
  {
    intent: "memory_timeline",
    mode: "historical",
    weight: 9,
    patterns: [
      /memory timeline/,
      /timeline highlights/,
      /what happened last month/,
      /last month/,
      /recent history/,
      /historical/,
    ],
  },
  {
    intent: "platform_status",
    mode: "status",
    weight: 8,
    patterns: [/how are we doing/, /platform status/, /overall status/, /how('s| is) crimson/],
  },
];

export function routeChatMessage(message: string): ChatRouteResult {
  const normalized = normalizeChatMessage(message);

  if (!normalized) {
    return { mode: "general", intent: "unknown", match_confidence: 0 };
  }

  let best: ChatRouteResult = { mode: "general", intent: "unknown", match_confidence: 0 };

  for (const entry of INTENT_PATTERNS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(normalized)) {
        const matchConfidence = Math.min(98, entry.weight * 10);
        if (matchConfidence > best.match_confidence) {
          best = {
            mode: entry.mode,
            intent: entry.intent,
            match_confidence: matchConfidence,
          };
        }
      }
    }
  }

  return best;
}
