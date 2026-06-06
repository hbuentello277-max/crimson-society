import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/nexus/auth";
import { getNexusHealthSnapshot } from "@/lib/monitoring/health-summary";
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
    const snapshot = await getNexusHealthSnapshot(session.supabase);

    return NextResponse.json({
      ok: true,
      system: {
        status: snapshot.systemStatus,
        checked_at: snapshot.checkedAt,
      },
      integrations: snapshot.integrations,
      latest_checks: snapshot.latestChecks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Nexus health.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
