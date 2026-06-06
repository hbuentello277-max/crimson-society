import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/nexus/auth";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { getRequestIpAddress, getRequestUserAgent } from "@/lib/nexus/request-meta";
import { emitNexusEvent } from "@/lib/events/emit";
import { processInternalNexusEvent } from "@/lib/events/processors/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiReadRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const timestamp = new Date().toISOString();
  const ipAddress = getRequestIpAddress(request);
  const userAgent = getRequestUserAgent(request);

  const activity = await logNexusActivity({
    actorId: session.userId,
    actorType: "owner",
    action: "nexus.ping",
    targetType: "nexus",
    details: { route: "/api/nexus/ping" },
    ipAddress,
    userAgent,
  });

  const event = await emitNexusEvent(
    processInternalNexusEvent({
      source: "system",
      category: "infra",
      eventType: "nexus.ping",
      severity: "info",
      title: "Nexus owner ping",
      description: "Owner health validation ping",
      payload: {
        owner_id: session.userId,
        route: "/api/nexus/ping",
      },
      occurredAt: timestamp,
      metadata: {
        actor_email: session.email,
      },
    }),
  );

  if (!activity.ok) {
    console.warn("[nexus-ping] activity log failed", activity.error);
  }

  if (!event.ok) {
    console.warn("[nexus-ping] event emit failed", event.error);
  }

  return NextResponse.json({
    ok: true,
    owner: {
      id: session.userId,
      email: session.email,
    },
    nexus: {
      status: "online",
    },
    timestamp,
    activityLogged: activity.ok,
    eventEmitted: event.ok,
  });
}
