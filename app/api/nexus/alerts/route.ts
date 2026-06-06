import { NextResponse } from "next/server";
import { getNexusAlertsSummary } from "@/lib/alerts/summary";
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
    const summary = await getNexusAlertsSummary(session.supabase);

    return NextResponse.json({
      ok: true,
      collected_at: summary.collected_at,
      counts: summary.counts,
      active: summary.active,
      recent_history: summary.recent_history,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Nexus alerts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
