import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { runNexusMetricsRollup } from "@/lib/metrics/rollup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNexusMetricsRollup();

  await logNexusActivity({
    actorType: "collector",
    action: "nexus.metrics_rollup.completed",
    targetType: "nexus",
    details: {
      ok: result.ok,
      period_start: result.periodStart,
      snapshots_recorded: result.snapshotsRecorded,
      events_emitted: result.eventsEmitted,
      revenue_mrr: result.metrics?.revenue.estimated_mrr ?? null,
      error: result.error ?? null,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Nexus metrics rollup failed",
        collected_at: result.collectedAt,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    collected_at: result.collectedAt,
    period_start: result.periodStart,
    snapshots_recorded: result.snapshotsRecorded,
    events_emitted: result.eventsEmitted,
    revenue: result.metrics?.revenue ?? null,
    growth: result.metrics?.growth ?? null,
    blackcard: result.metrics?.blackcard ?? null,
    activity: result.metrics?.activity ?? null,
  });
}
