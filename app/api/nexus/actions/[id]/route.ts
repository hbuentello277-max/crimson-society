import { NextResponse } from "next/server";
import { updateNexusActionCard } from "@/lib/action-center/manager";
import { requireNexusActionOwner } from "@/lib/action-center/permissions";
import type { UpdateNexusActionInput } from "@/lib/action-center/types";
import { checkOwnerApiWriteRateLimit, ownerRateLimitResponse } from "@/lib/nexus/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ACTIONS = new Set<UpdateNexusActionInput["action"]>([
  "approve",
  "reject",
  "execute",
  "edit",
  "submit",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireNexusActionOwner();
  if ("error" in auth) {
    return auth.error;
  }

  const rateLimit = checkOwnerApiWriteRateLimit(auth.session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const { id } = await context.params;

  let body: UpdateNexusActionInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.action || !ALLOWED_ACTIONS.has(body.action)) {
    return NextResponse.json({ error: "Valid action is required." }, { status: 400 });
  }

  const result = await updateNexusActionCard(auth.session.supabase, {
    actionId: id,
    ownerId: auth.session.userId,
    patch: body,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, action: result.action });
}
