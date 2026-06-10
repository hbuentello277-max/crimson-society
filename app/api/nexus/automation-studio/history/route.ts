import { NextResponse } from "next/server";
import { listAutomationHistory } from "@/lib/automation-studio/manager";
import { requireAutomationStudioReader } from "@/lib/automation-studio/permissions";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { nexusOk } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAutomationStudioReader();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiReadRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

  try {
    const history = await listAutomationHistory(session.supabase, limit);
    return nexusOk({ history });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load automation history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
