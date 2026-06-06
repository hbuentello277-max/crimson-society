import { NextResponse } from "next/server";
import { createWarRoomFromIncident } from "@/lib/war-room/manager";
import { getNexusWarRoomsSummary } from "@/lib/war-room/summary";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PostBody = {
  incident_id?: string;
  title?: string;
};

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
    const summary = await getNexusWarRoomsSummary(session.supabase);

    return NextResponse.json({
      ok: true,
      collected_at: summary.collected_at,
      counts: summary.counts,
      open: summary.open,
      recent_history: summary.recent_history,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load war rooms.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiWriteRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.incident_id) {
    return NextResponse.json({ error: "incident_id is required" }, { status: 400 });
  }

  const result = await createWarRoomFromIncident({
    ownerId: session.userId,
    incidentId: body.incident_id,
    title: body.title,
    ownerSupabase: session.supabase,
  });

  if (!result.ok) {
    const status =
      result.code === "not_found" ? 404 : result.code === "duplicate" ? 409 : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    war_room: result.war_room,
    created: result.created,
  });
}
