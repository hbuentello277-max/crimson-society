import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusMemorySummary } from "@/lib/memory/summary";

export type FounderMemoryTopic = "monetization" | "growth" | "launch" | "general";

const TOPIC_PATTERNS: Record<FounderMemoryTopic, RegExp[]> = {
  monetization: [
    /\bblackcard\b/i,
    /\bpricing\b/i,
    /\bannual\b/i,
    /\brevenue\b/i,
    /\bmonetiz/i,
    /\bsubscription\b/i,
  ],
  growth: [/\bbeta\b/i, /\bads?\b/i, /\bmember\b/i, /\bretention\b/i, /\bengagement\b/i, /\breferral\b/i],
  launch: [/\blaunch\b/i, /\bblocker\b/i, /\breadiness\b/i, /\bship\b/i],
  general: [/.*/],
};

export async function getFounderMemoryHints(
  admin: SupabaseClient,
  topic: FounderMemoryTopic = "general",
  limit = 2,
): Promise<string[]> {
  try {
    const summary = await getNexusMemorySummary(admin, { limit: 40 });
    const patterns = TOPIC_PATTERNS[topic];

    const matches = summary.entries.filter((entry) => {
      const haystack = `${entry.title} ${entry.summary}`;
      return patterns.some((pattern) => pattern.test(haystack));
    });

    return matches.slice(0, limit).map((entry) => `${entry.title}: ${entry.summary}`);
  } catch {
    return [];
  }
}

export function pickMemoryHintForRecommendation(
  hints: string[],
  recommendationText: string,
): string | null {
  if (hints.length === 0) {
    return null;
  }

  const normalized = recommendationText.toLowerCase();
  const direct = hints.find((hint) => {
    const lower = hint.toLowerCase();
    return (
      (normalized.includes("blackcard") && lower.includes("blackcard")) ||
      (normalized.includes("pricing") && lower.includes("pricing")) ||
      (normalized.includes("beta") && lower.includes("beta")) ||
      (normalized.includes("ads") && lower.includes("ad")) ||
      (normalized.includes("launch") && lower.includes("launch"))
    );
  });

  return direct ?? hints[0] ?? null;
}
