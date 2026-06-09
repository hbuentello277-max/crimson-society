import {
  assertNexusCronAuthorized,
  NexusCronJobError,
  nexusCronUnauthorizedResponse,
  runNexusCronRoute,
} from "@/lib/nexus/cron-handler";
import { runNexusMetricsRollup } from "@/lib/metrics/rollup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!assertNexusCronAuthorized(request)) {
    return nexusCronUnauthorizedResponse();
  }

  return runNexusCronRoute("metrics_rollup", async () => {
    const result = await runNexusMetricsRollup();
    if (!result.ok) {
      throw new NexusCronJobError(result.error ?? "Nexus metrics rollup failed");
    }

    return {
      body: {
        collected_at: result.collectedAt,
        period_start: result.periodStart,
        snapshots_recorded: result.snapshotsRecorded,
        events_emitted: result.eventsEmitted,
        revenue: result.metrics?.revenue ?? null,
        growth: result.metrics?.growth ?? null,
        blackcard: result.metrics?.blackcard ?? null,
        activity: result.metrics?.activity ?? null,
      },
      details: {
        period_start: result.periodStart,
        snapshots_recorded: result.snapshotsRecorded,
        events_emitted: result.eventsEmitted,
        revenue_mrr: result.metrics?.revenue.estimated_mrr ?? null,
      },
    };
  });
}
