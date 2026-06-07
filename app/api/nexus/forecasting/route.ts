import { NextResponse } from "next/server";
import { getNexusForecasting } from "@/lib/forecasting/engine";
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
    const forecasting = await getNexusForecasting(session.supabase);

    return NextResponse.json({
      ok: true,
      generated_at: forecasting.generated_at,
      summary: forecasting.summary,
      forecasts: forecasting.forecasts,
      counts_by_category: forecasting.counts_by_category,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Nexus forecasting.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
