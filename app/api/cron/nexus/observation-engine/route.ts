import {
  assertNexusCronAuthorized,
  NexusCronJobError,
  nexusCronUnauthorizedResponse,
  runNexusCronRoute,
} from "@/lib/nexus/cron-handler";
import { runNexusObservationEngine } from "@/lib/observations/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!assertNexusCronAuthorized(request)) {
    return nexusCronUnauthorizedResponse();
  }

  return runNexusCronRoute("observation_engine", async () => {
    const result = await runNexusObservationEngine();
    if (!result.ok) {
      throw new NexusCronJobError(result.error ?? "Nexus observation evaluation failed");
    }

    return {
      body: {
        evaluated_at: result.evaluatedAt,
        rules_evaluated: result.rulesEvaluated,
        rules_skipped: result.rulesSkipped,
        observations_created: result.observationsCreated,
        observations_superseded: result.observationsSuperseded,
        observations_expired: result.observationsExpired,
        observations_cleaned: result.observationsCleaned,
        events_emitted: result.eventsEmitted,
      },
      details: {
        rules_evaluated: result.rulesEvaluated,
        observations_created: result.observationsCreated,
        observations_superseded: result.observationsSuperseded,
        observations_expired: result.observationsExpired,
        events_emitted: result.eventsEmitted,
      },
    };
  });
}
