import { NextResponse } from "next/server";
import { executeApprovedAutomationAction } from "@/lib/operator/manager";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiWriteRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const { id } = await context.params;

  const result = await executeApprovedAutomationAction(session.supabase, {
    automationActionId: id,
    ownerId: session.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    execution: result.execution,
    run_ok: result.run_ok,
    run_error: result.run_error ?? null,
  });
}
