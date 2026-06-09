import type { FounderRecommendation } from "@/lib/founder-copilot/types";
import type { FounderPriorityItem } from "@/lib/proactive-intelligence/types";

/** Lower rank = higher priority. Platform stability always outranks cosmetic/UI. */
export const FOUNDER_PRIORITY_TIERS = [
  "platform_stability",
  "revenue",
  "growth",
  "blackcard",
  "community",
  "cosmetic",
] as const;

export type FounderPriorityTier = (typeof FOUNDER_PRIORITY_TIERS)[number];

const TIER_RANK: Record<FounderPriorityTier, number> = {
  platform_stability: 0,
  revenue: 1,
  growth: 2,
  blackcard: 3,
  community: 4,
  cosmetic: 5,
};

const URGENCY_RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export function recommendationTier(
  recommendation: Pick<FounderRecommendation, "category" | "title" | "reason">,
): FounderPriorityTier {
  const haystack = `${recommendation.title} ${recommendation.reason}`.toLowerCase();

  if (
    recommendation.category === "platform" ||
    recommendation.category === "jobs" ||
    recommendation.category === "risk" ||
    /\b(alert|incident|failed job|platform health|checkout|media|cron|degraded)\b/i.test(haystack)
  ) {
    return "platform_stability";
  }

  if (recommendation.category === "metrics" && /\b(revenue|mrr|arr|order|checkout)\b/i.test(haystack)) {
    return "revenue";
  }

  if (recommendation.category === "growth" || /\b(member|signup|retention|engagement)\b/i.test(haystack)) {
    return "growth";
  }

  if (/\b(blackcard|subscription|conversion|annual)\b/i.test(haystack)) {
    return "blackcard";
  }

  if (recommendation.category === "reports" || /\b(community|moderation|report)\b/i.test(haystack)) {
    return "community";
  }

  if (/\b(ui|cosmetic|copy|layout|polish)\b/i.test(haystack)) {
    return "cosmetic";
  }

  if (recommendation.category === "launch") {
    return "platform_stability";
  }

  return "growth";
}

export function priorityItemTier(item: Pick<FounderPriorityItem, "title" | "reason" | "type">): FounderPriorityTier {
  const haystack = `${item.title} ${item.reason}`.toLowerCase();

  if (item.type === "issue" || /\b(alert|incident|failed|degraded|critical)\b/i.test(haystack)) {
    return "platform_stability";
  }

  if (/\b(revenue|mrr|checkout|order)\b/i.test(haystack)) {
    return "revenue";
  }

  if (/\b(blackcard|subscription|conversion)\b/i.test(haystack)) {
    return "blackcard";
  }

  if (/\b(member|signup|retention|engagement|growth)\b/i.test(haystack)) {
    return "growth";
  }

  if (/\b(report|moderation|community)\b/i.test(haystack)) {
    return "community";
  }

  if (/\b(ui|cosmetic|polish)\b/i.test(haystack)) {
    return "cosmetic";
  }

  return item.type === "opportunity" ? "growth" : "platform_stability";
}

export function rankFounderRecommendations(
  recommendations: FounderRecommendation[],
): FounderRecommendation[] {
  return [...recommendations].sort((a, b) => {
    const tierDiff = TIER_RANK[recommendationTier(a)] - TIER_RANK[recommendationTier(b)];
    if (tierDiff !== 0) {
      return tierDiff;
    }
    return a.priority - b.priority;
  });
}

export function rankFounderPriorityItems(items: FounderPriorityItem[]): FounderPriorityItem[] {
  return [...items]
    .sort((a, b) => {
      const tierDiff = TIER_RANK[priorityItemTier(a)] - TIER_RANK[priorityItemTier(b)];
      if (tierDiff !== 0) {
        return tierDiff;
      }
      const urgencyDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
      if (urgencyDiff !== 0) {
        return urgencyDiff;
      }
      return a.rank - b.rank;
    })
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
