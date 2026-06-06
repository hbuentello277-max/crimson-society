import { NextResponse } from "next/server";
import { getNexusObservationsSummary } from "@/lib/observations/summary";
import type { ObservationsListView } from "@/lib/observations/types";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_VIEWS = new Set<ObservationsListView>(["active", "history", "all"]);

function parseViewParam(value: string | null): ObservationsListView {
  if (value && ALLOWED_VIEWS.has(value as ObservationsListView)) {
    return value as ObservationsListView;
  }

  return "all";
}

export async function GET(request: Request) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiReadRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const view = parseViewParam(new URL(request.url).searchParams.get("view"));

  try {
    const summary = await getNexusObservationsSummary(session.supabase, { view });

    return NextResponse.json({
      ok: true,
      view,
      collected_at: summary.collected_at,
      counts: summary.counts,
      active: summary.active,
      recent_history: summary.recent_history,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Nexus observations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
