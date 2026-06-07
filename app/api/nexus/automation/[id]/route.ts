import { NextResponse } from "next/server";
import {
  getAutomationActionById,
  updateOwnerAutomationStatus,
} from "@/lib/automation/manager";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import type { UpdateAutomationStatusAction } from "@/lib/automation/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIONS = new Set<UpdateAutomationStatusAction>(["approve", "reject", "archive"]);

type PatchBody = {
  action?: UpdateAutomationStatusAction;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiReadRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const { id } = await context.params;

  try {
    const automationAction = await getAutomationActionById(session.supabase, id);
    if (!automationAction) {
      return NextResponse.json({ error: "Automation action not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, action: automationAction });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load automation action.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
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

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action || !ACTIONS.has(body.action)) {
    return NextResponse.json({ error: "Invalid automation action" }, { status: 400 });
  }

  const result = await updateOwnerAutomationStatus(session.supabase, {
    actionId: id,
    ownerId: session.userId,
    action: body.action,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    action: result.action,
    event_emitted: result.event_emitted,
  });
}
