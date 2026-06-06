import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { runNexusHealthEngine } from "@/lib/monitoring/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNexusHealthEngine();

  await logNexusActivity({
    actorType: "collector",
    action: "nexus.health_check.completed",
    targetType: "nexus",
    details: {
      ok: result.ok,
      system_status: result.systemStatus,
      checks_recorded: result.checksRecorded,
      events_emitted: result.eventsEmitted,
      error: result.error ?? null,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Nexus health check failed",
        checked_at: result.checkedAt,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    checked_at: result.checkedAt,
    system_status: result.systemStatus,
    integrations: result.integrations,
    checks_recorded: result.checksRecorded,
    events_emitted: result.eventsEmitted,
  });
}
