import { NextResponse } from "next/server";
import { getOperationsPlanById } from "@/lib/operations-planner/manager";
import { nexusOk } from "@/lib/nexus/route-handler";
import { checkOwnerApiReadRateLimit, ownerRateLimitResponse } from "@/lib/nexus/rate-limit";
import { requireOwnerSession } from "@/lib/nexus/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const rateLimit = checkOwnerApiReadRateLimit(auth.session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const { id } = await context.params;
  const plan = await getOperationsPlanById(auth.session.supabase, id);
  if (!plan) {
    return NextResponse.json({ error: "Operations plan not found." }, { status: 404 });
  }

  return nexusOk({ plan, readOnly: true as const });
}
