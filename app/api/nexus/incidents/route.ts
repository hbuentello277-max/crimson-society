import { NextResponse } from "next/server";
import { getNexusIncidentsSummary } from "@/lib/incidents/summary";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiReadRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  try {
    const summary = await getNexusIncidentsSummary(session.supabase);

    return NextResponse.json({
      ok: true,
      collected_at: summary.collected_at,
      counts: summary.counts,
      open: summary.open,
      recent_history: summary.recent_history,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Nexus incidents.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
