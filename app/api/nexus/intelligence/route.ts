import { NextRequest, NextResponse } from "next/server";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import type { IntelligenceSort } from "@/lib/intelligence/types";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseSort(value: string | null): IntelligenceSort {
  return value === "confidence" ? "confidence" : "impact";
}

export async function GET(request: NextRequest) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiReadRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const sort = parseSort(request.nextUrl.searchParams.get("sort"));

  try {
    const intelligence = await getNexusIntelligence(session.supabase, { sort });

    return NextResponse.json({
      ok: true,
      ...intelligence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Nexus intelligence.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
