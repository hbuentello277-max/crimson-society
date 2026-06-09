import {
  assertNexusCronAuthorized,
  NexusCronJobError,
  nexusCronUnauthorizedResponse,
  runNexusCronRoute,
} from "@/lib/nexus/cron-handler";
import { runNexusMissionHealthEngine } from "@/lib/mission-health/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!assertNexusCronAuthorized(request)) {
    return nexusCronUnauthorizedResponse();
  }

  return runNexusCronRoute("mission_health", async () => {
    const result = await runNexusMissionHealthEngine();
    if (!result.ok) {
      throw new NexusCronJobError(result.error ?? "Nexus platform health check failed");
    }

    return {
      body: {
        checked_at: result.checkedAt,
        score: result.score,
        status: result.status,
        mission_critical: result.missionCritical,
        workflows: result.workflows,
        checks_recorded: result.checksRecorded,
        events_emitted: result.eventsEmitted,
      },
      details: {
        mission_score: result.score,
        mission_status: result.status,
        mission_critical: result.missionCritical,
        checks_recorded: result.checksRecorded,
        events_emitted: result.eventsEmitted,
      },
    };
  });
}
