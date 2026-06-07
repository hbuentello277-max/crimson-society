import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { runNexusMissionHealthEngine } from "@/lib/mission-health/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNexusMissionHealthEngine();

  await logNexusActivity({
    actorType: "collector",
    action: "nexus.mission_health.completed",
    targetType: "nexus",
    details: {
      ok: result.ok,
      mission_score: result.score,
      mission_status: result.status,
      mission_critical: result.missionCritical,
      checks_recorded: result.checksRecorded,
      events_emitted: result.eventsEmitted,
      error: result.error ?? null,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Nexus platform status check failed",
        checked_at: result.checkedAt,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    checked_at: result.checkedAt,
    score: result.score,
    status: result.status,
    mission_critical: result.missionCritical,
    workflows: result.workflows,
    checks_recorded: result.checksRecorded,
    events_emitted: result.eventsEmitted,
  });
}
