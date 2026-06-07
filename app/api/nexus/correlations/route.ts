import { NextRequest, NextResponse } from "next/server";
import { getNexusCorrelations } from "@/lib/correlations/summary";
import {
  CORRELATION_CATEGORIES,
  CORRELATION_WINDOWS,
  type CorrelationCategory,
  type CorrelationSort,
  type CorrelationWindow,
} from "@/lib/correlations/types";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";

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

export async function GET(request: NextRequest) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiReadRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const categoryParam = request.nextUrl.searchParams.get("category");
  const category =
    categoryParam && CATEGORY_SET.has(categoryParam)
      ? (categoryParam as CorrelationCategory)
      : "all";
  const sort = parseSort(request.nextUrl.searchParams.get("sort"));
  const window = parseWindow(request.nextUrl.searchParams.get("window"));

  try {
    const summary = await getNexusCorrelations(session.supabase, {
      category,
      sort,
      window,
    });

    return NextResponse.json({
      ok: true,
      generated_at: summary.generated_at,
      window: summary.window,
      counts_by_category: summary.counts_by_category,
      correlations: summary.correlations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Nexus correlations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
