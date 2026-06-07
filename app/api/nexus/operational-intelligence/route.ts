import { NextResponse } from "next/server";
import { getNexusOperationalIntelligence } from "@/lib/operational-intelligence/engine";
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
    const intelligence = await getNexusOperationalIntelligence(session.supabase);

    return NextResponse.json({
      ok: true,
      generated_at: intelligence.generated_at,
      overview: intelligence.overview,
      relationships: intelligence.relationships,
      patterns: intelligence.patterns,
      influence_rankings: intelligence.influence_rankings,
      drivers: intelligence.drivers,
      drag: intelligence.drag,
      recommendations: intelligence.recommendations,
      counts_by_category: intelligence.counts_by_category,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load operational intelligence.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
