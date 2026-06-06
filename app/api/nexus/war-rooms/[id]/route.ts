import { NextResponse } from "next/server";
import { getNexusWarRoomDetail } from "@/lib/war-room/aggregator";
import { updateOwnerWarRoom } from "@/lib/war-room/manager";
import { requireOwnerSession } from "@/lib/nexus/auth";
import { NEXUS_WAR_ROOM_STATUSES } from "@/lib/nexus/constants";
import {
  checkOwnerApiReadRateLimit,
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import type { NexusWarRoomStatus } from "@/lib/nexus/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_STATUSES = new Set<NexusWarRoomStatus>(NEXUS_WAR_ROOM_STATUSES);

type PatchBody = {
  status?: string;
  owner_notes?: string;
  root_cause?: string;
  impact_summary?: string;
  resolution_summary?: string;
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
    const detail = await getNexusWarRoomDetail(session.supabase, id);
    if (!detail) {
      return NextResponse.json({ error: "War room not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load war room.";
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

  if (body.status && !ALLOWED_STATUSES.has(body.status as NexusWarRoomStatus)) {
    return NextResponse.json({ error: "Invalid war room status" }, { status: 400 });
  }

  const hasUpdates =
    body.status ||
    body.owner_notes !== undefined ||
    body.root_cause !== undefined ||
    body.impact_summary !== undefined ||
    body.resolution_summary !== undefined;

  if (!hasUpdates) {
    return NextResponse.json({ error: "No supported patch fields provided" }, { status: 400 });
  }

  const result = await updateOwnerWarRoom(session.supabase, {
    warRoomId: id,
    ownerId: session.userId,
    status: body.status as NexusWarRoomStatus | undefined,
    owner_notes: body.owner_notes,
    root_cause: body.root_cause,
    impact_summary: body.impact_summary,
    resolution_summary: body.resolution_summary,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    war_room_id: result.war_room_id,
    event_emitted: result.event_emitted,
  });
}
