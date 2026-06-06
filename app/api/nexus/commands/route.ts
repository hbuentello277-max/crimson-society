import { NextResponse } from "next/server";
import { getNexusCommandsSummary } from "@/lib/commands/summary";
import { requireOwnerSession } from "@/lib/nexus/auth";
import { NEXUS_COMMAND_STATUSES } from "@/lib/nexus/constants";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import type { NexusCommandStatus } from "@/lib/nexus/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_SET = new Set<string>([...NEXUS_COMMAND_STATUSES, "closed"]);

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

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && STATUS_SET.has(statusParam)
      ? (statusParam as NexusCommandStatus | "closed")
      : undefined;

  try {
    const summary = await getNexusCommandsSummary(session.supabase, {
      status,
      alert_id: url.searchParams.get("alert_id") ?? undefined,
      incident_id: url.searchParams.get("incident_id") ?? undefined,
      observation_id: url.searchParams.get("observation_id") ?? undefined,
      war_room_id: url.searchParams.get("war_room_id") ?? undefined,
      runbook_id: url.searchParams.get("runbook_id") ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      collected_at: summary.collected_at,
      counts: summary.counts,
      commands: summary.commands,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load commands.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
