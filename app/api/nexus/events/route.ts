import { NextResponse } from "next/server";
import { getNexusRecentEvents } from "@/lib/nexus/events-summary";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseLimit(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
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

  const limit = parseLimit(new URL(request.url).searchParams.get("limit"));

  try {
    const summary = await getNexusRecentEvents(session.supabase, limit);

    return NextResponse.json({
      ok: true,
      collected_at: summary.collected_at,
      events: summary.events,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Nexus events.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
