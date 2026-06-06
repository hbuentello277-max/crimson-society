import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { runNexusAlertEngine } from "@/lib/alerts/engine";
import { logNexusActivity } from "@/lib/nexus/activity-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNexusAlertEngine();

  await logNexusActivity({
    actorType: "collector",
    action: "nexus.alert_evaluation.completed",
    targetType: "nexus",
    details: {
      ok: result.ok,
      rules_evaluated: result.rulesEvaluated,
      alerts_created: result.alertsCreated,
      alerts_updated: result.alertsUpdated,
      alerts_resolved: result.alertsResolved,
      recoveries_emitted: result.recoveriesEmitted,
      events_emitted: result.eventsEmitted,
      rules_skipped: result.rulesSkipped,
      error: result.error ?? null,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Nexus alert evaluation failed",
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
    alerts_created: result.alertsCreated,
    alerts_updated: result.alertsUpdated,
    alerts_resolved: result.alertsResolved,
    recoveries_emitted: result.recoveriesEmitted,
    events_emitted: result.eventsEmitted,
  });
}
