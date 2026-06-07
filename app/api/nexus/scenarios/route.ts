import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { getNexusScenarios } from "@/lib/scenarios/engine";

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
    const summary = await getNexusScenarios(session.supabase);

    return NextResponse.json({
      ok: true,
      ...summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Strategic Scenario Engine.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
