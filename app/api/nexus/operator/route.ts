import { NextResponse } from "next/server";
import { getOperatorDashboard } from "@/lib/operator/history";
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
    const dashboard = await getOperatorDashboard(session.supabase);

    return NextResponse.json({
      ok: true,
      collected_at: dashboard.collected_at,
      ready: dashboard.ready,
      running: dashboard.running,
      completed: dashboard.completed,
      failed: dashboard.failed,
      history: dashboard.history,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load operator dashboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
