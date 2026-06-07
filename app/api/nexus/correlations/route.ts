import { getNexusCorrelations } from "@/lib/correlations/summary";
import {
  CORRELATION_CATEGORIES,
  CORRELATION_WINDOWS,
  type CorrelationCategory,
  type CorrelationSort,
  type CorrelationWindow,
} from "@/lib/correlations/types";
import { nexusOk, ownerReadRouteWithRequest } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORY_SET = new Set<string>(CORRELATION_CATEGORIES);
const WINDOW_SET = new Set<string>(CORRELATION_WINDOWS);

function parseSort(value: string | null): CorrelationSort {
  return value === "confidence" ? "confidence" : "impact";
}

function parseWindow(value: string | null): CorrelationWindow {
  if (value && WINDOW_SET.has(value)) {
    return value as CorrelationWindow;
  }

  return "7d";
}

export const GET = ownerReadRouteWithRequest(
  async ({ supabase, request }) => {
    const params = new URL(request.url).searchParams;
    const categoryParam = params.get("category");
    const category =
      categoryParam && CATEGORY_SET.has(categoryParam)
        ? (categoryParam as CorrelationCategory)
        : "all";
    const sort = parseSort(params.get("sort"));
    const window = parseWindow(params.get("window"));

    return nexusOk(
      await getNexusCorrelations(supabase, {
        category,
        sort,
        window,
      }),
    );
  },
  "Failed to load Nexus correlations.",
);
