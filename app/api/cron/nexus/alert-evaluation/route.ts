import { runNexusAlertEngine } from "@/lib/alerts/engine";
import {
  assertNexusCronAuthorized,
  NexusCronJobError,
  nexusCronUnauthorizedResponse,
  runNexusCronRoute,
} from "@/lib/nexus/cron-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!assertNexusCronAuthorized(request)) {
    return nexusCronUnauthorizedResponse();
  }

  return runNexusCronRoute("alert_evaluation", async () => {
    const result = await runNexusAlertEngine();
    if (!result.ok) {
      throw new NexusCronJobError(result.error ?? "Nexus alert evaluation failed");
    }

    return {
      body: {
        evaluated_at: result.evaluatedAt,
        rules_evaluated: result.rulesEvaluated,
        rules_skipped: result.rulesSkipped,
        alerts_created: result.alertsCreated,
        alerts_updated: result.alertsUpdated,
        alerts_resolved: result.alertsResolved,
        recoveries_emitted: result.recoveriesEmitted,
        events_emitted: result.eventsEmitted,
        incidents_created: result.incidentsCreated,
        incidents_updated: result.incidentsUpdated,
        alerts_linked_to_incidents: result.alertsLinkedToIncidents,
        suggest_resolve_incident_ids: result.suggestResolveIncidentIds,
      },
      details: {
        rules_evaluated: result.rulesEvaluated,
        alerts_created: result.alertsCreated,
        alerts_updated: result.alertsUpdated,
        alerts_resolved: result.alertsResolved,
        events_emitted: result.eventsEmitted,
      },
    };
  });
}
