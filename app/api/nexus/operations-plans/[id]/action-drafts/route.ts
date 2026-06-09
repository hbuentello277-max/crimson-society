import { NextResponse } from "next/server";
import { createActionDraftsFromOperationsPlan } from "@/lib/operations-planner/action-integration";
import { nexusOk } from "@/lib/nexus/route-handler";
import { checkOwnerApiWriteRateLimit, ownerRateLimitResponse } from "@/lib/nexus/rate-limit";
import { requireOwnerSession } from "@/lib/nexus/auth";

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

  const rateLimit = checkOwnerApiWriteRateLimit(auth.session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const { id } = await context.params;
  const result = await createActionDraftsFromOperationsPlan(auth.session.supabase, {
    ownerId: auth.session.userId,
    planId: id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return nexusOk({
    created: result.created,
    readOnly: true as const,
  });
}
