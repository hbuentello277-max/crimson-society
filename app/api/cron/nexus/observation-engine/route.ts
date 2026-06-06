import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { runNexusObservationEngine } from "@/lib/observations/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNexusObservationEngine();

  await logNexusActivity({
    actorType: "collector",
    action: "nexus.observation_evaluation.completed",
    targetType: "nexus",
    details: {
      ok: result.ok,
      rules_evaluated: result.rulesEvaluated,
      observations_created: result.observationsCreated,
      observations_superseded: result.observationsSuperseded,
      observations_expired: result.observationsExpired,
      observations_cleaned: result.observationsCleaned,
      events_emitted: result.eventsEmitted,
      rules_skipped: result.rulesSkipped,
      error: result.error ?? null,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Nexus observation evaluation failed",
        evaluated_at: result.evaluatedAt,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    evaluated_at: result.evaluatedAt,
    rules_evaluated: result.rulesEvaluated,
    rules_skipped: result.rulesSkipped,
    observations_created: result.observationsCreated,
    observations_superseded: result.observationsSuperseded,
    observations_expired: result.observationsExpired,
    observations_cleaned: result.observationsCleaned,
    events_emitted: result.eventsEmitted,
  });
}
