import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/nexus/auth";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import {
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { runNexusSyncPipeline } from "@/lib/nexus/sync-pipeline";
import { getNexusIntelligence } from "@/lib/intelligence/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiWriteRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  try {
    const result = await runNexusSyncPipeline(session.supabase);

    await getNexusIntelligence(session.supabase);

    await logNexusActivity({
      actorId: session.userId,
      actorType: "owner",
      action: "nexus.sync.completed",
      targetType: "nexus",
      details: {
        ok: result.ok,
        synced_at: result.synced_at,
        errors: result.errors,
      },
    });

    return NextResponse.json(
      {
        ok: result.ok,
        synced_at: result.synced_at,
        steps: {
          health: result.health,
          mission: result.mission,
          metrics: result.metrics,
          alerts: result.alerts,
          observations: result.observations,
          commands: result.commands,
          reports: result.reports,
          briefings: result.briefings,
          memory: result.memory,
        },
        errors: result.errors,
      },
      { status: result.ok ? 200 : 207 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nexus sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
