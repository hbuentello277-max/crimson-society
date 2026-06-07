import { NextResponse } from "next/server";
import { getNexusDecisionEngine } from "@/lib/decision-engine/engine";
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
    const summary = await getNexusDecisionEngine(session.supabase);

    return NextResponse.json({
      ok: true,
      ...summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Executive Decision Engine.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
