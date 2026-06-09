import {
  assertNexusCronAuthorized,
  NexusCronJobError,
  nexusCronUnauthorizedResponse,
  runNexusCronRoute,
} from "@/lib/nexus/cron-handler";
import { runNexusHealthEngine } from "@/lib/monitoring/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!assertNexusCronAuthorized(request)) {
    return nexusCronUnauthorizedResponse();
  }

  return runNexusCronRoute("health_check", async () => {
    const result = await runNexusHealthEngine();
    if (!result.ok) {
      throw new NexusCronJobError(result.error ?? "Nexus health check failed");
    }

    return {
      body: {
        checked_at: result.checkedAt,
        system_status: result.systemStatus,
        integrations: result.integrations,
        checks_recorded: result.checksRecorded,
        events_emitted: result.eventsEmitted,
      },
      details: {
        system_status: result.systemStatus,
        checks_recorded: result.checksRecorded,
        events_emitted: result.eventsEmitted,
      },
    };
  });
}
