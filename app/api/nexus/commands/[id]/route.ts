import { NextResponse } from "next/server";
import { getNexusCommandById, updateOwnerCommandStatus } from "@/lib/commands/manager";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import type { UpdateCommandStatusAction } from "@/lib/commands/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIONS = new Set<UpdateCommandStatusAction>([
  "approve",
  "reject",
  "dismiss",
  "complete",
]);

type PatchBody = {
  action?: UpdateCommandStatusAction;
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
    const command = await getNexusCommandById(session.supabase, id);
    if (!command) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, command });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load command.";
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
    return NextResponse.json({ error: "Invalid command action" }, { status: 400 });
  }

  const result = await updateOwnerCommandStatus(session.supabase, {
    commandId: id,
    ownerId: session.userId,
    action: body.action,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    command: result.command,
    event_emitted: result.event_emitted,
  });
}
