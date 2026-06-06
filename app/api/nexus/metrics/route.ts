import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/nexus/auth";
import { getNexusMetricsSummary } from "@/lib/metrics/summary";
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
    const snapshot = await getNexusMetricsSummary(session.supabase);

    return NextResponse.json({
      ok: true,
      collected_at: snapshot.collected_at,
      snapshot_count: snapshot.snapshot_count,
      revenue: snapshot.revenue,
      growth: snapshot.growth,
      blackcard: snapshot.blackcard,
      activity: snapshot.activity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Nexus metrics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
