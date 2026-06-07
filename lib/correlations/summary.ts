import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCorrelationItems } from "@/lib/correlations/engine";
import {
  CORRELATION_CATEGORIES,
  type CorrelationCategory,
  type CorrelationItem,
  type CorrelationSort,
  type CorrelationWindow,
  type CorrelationsSummary,
} from "@/lib/correlations/types";

export function sortCorrelationItems(
  items: CorrelationItem[],
  sort: CorrelationSort,
): CorrelationItem[] {
  const copy = [...items];

  copy.sort((a, b) => {
    if (sort === "confidence") {
      return b.confidence_score - a.confidence_score || b.impact_score - a.impact_score;
    }

    return b.impact_score - a.impact_score || b.confidence_score - a.confidence_score;
  });

  return copy;
}

export function countCorrelationsByCategory(
  items: CorrelationItem[],
): CorrelationsSummary["counts_by_category"] {
  const counts = Object.fromEntries(
    CORRELATION_CATEGORIES.map((category) => [category, 0]),
  ) as CorrelationsSummary["counts_by_category"];

  for (const item of items) {
    counts[item.category] += 1;
  }

  return counts;
}

export async function getNexusCorrelations(
  supabase: SupabaseClient,
  options?: {
    category?: CorrelationCategory | "all";
    sort?: CorrelationSort;
    window?: CorrelationWindow;
  },
): Promise<CorrelationsSummary> {
  const window = options?.window ?? "7d";
  const sort = options?.sort ?? "impact";
  const category = options?.category ?? "all";

  const { context, items } = await buildCorrelationItems(supabase, window);

  const filtered =
    category === "all" ? items : items.filter((item) => item.category === category);

  const correlations = sortCorrelationItems(filtered, sort);

  return {
    generated_at: context.generated_at,
    window,
    counts_by_category: countCorrelationsByCategory(items),
    correlations,
  };
}
