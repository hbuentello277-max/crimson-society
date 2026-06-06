import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertEvaluationContext } from "@/lib/alerts/types";
import {
  findIndividualEscalationCandidates,
  findRollupEscalationCandidates,
  integrationIdFromAlert,
} from "@/lib/incidents/escalation";
import {
  createIncidentFromAlerts,
  suggestIncidentResolve,
  updateIncidentImpactFromAlerts,
} from "@/lib/incidents/manager";
import type {
  EscalationAlertRow,
  IncidentDbRow,
  IncidentEscalationResult,
} from "@/lib/incidents/types";

async function loadEscalationAlerts(
  admin: SupabaseClient,
): Promise<EscalationAlertRow[]> {
  const { data, error } = await admin
    .from("nexus_alerts")
    .select(
      "id, rule_id, category, severity, status, title, message, dedupe_key, incident_id, created_at, updated_at, metadata",
    )
    .in("status", ["active", "acknowledged"]);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EscalationAlertRow[];
}

async function loadOpenIncidents(admin: SupabaseClient): Promise<IncidentDbRow[]> {
  const { data, error } = await admin
    .from("nexus_incidents")
    .select(
      "id, title, status, severity, integration_id, started_at, resolved_at, root_cause, impact_summary, timeline, metadata, created_at, updated_at",
    )
    .in("status", ["open", "investigating", "mitigated"]);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as IncidentDbRow[];
}

async function loadLinkedAlerts(
  admin: SupabaseClient,
  incidentId: string,
): Promise<EscalationAlertRow[]> {
  const { data, error } = await admin
    .from("nexus_alerts")
    .select(
      "id, rule_id, category, severity, status, title, message, dedupe_key, incident_id, created_at, updated_at, metadata",
    )
    .eq("incident_id", incidentId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EscalationAlertRow[];
}

async function checkRecoveryIncidentSuggestions(
  admin: SupabaseClient,
): Promise<string[]> {
  const openIncidents = await loadOpenIncidents(admin);
  const suggested: string[] = [];

  for (const incident of openIncidents) {
    const linked = await loadLinkedAlerts(admin, incident.id);
    if (linked.length === 0) {
      continue;
    }

    const allResolved = linked.every((alert) =>
      ["resolved", "suppressed"].includes(alert.status),
    );

    if (allResolved) {
      const ok = await suggestIncidentResolve(admin, incident.id);
      if (ok) {
        suggested.push(incident.id);
      }
    }
  }

  return suggested;
}

export async function runIncidentEscalationPass(
  admin: SupabaseClient,
  input: {
    evaluated_at: string;
    context?: AlertEvaluationContext;
  },
): Promise<IncidentEscalationResult> {
  let alerts = await loadEscalationAlerts(admin);
  const escalatedAlertIds = new Set<string>();
  let incidentsCreated = 0;
  let incidentsUpdated = 0;
  let alertsLinked = 0;
  let eventsEmitted = 0;

  const individualCandidates = findIndividualEscalationCandidates({
    alerts,
    evaluated_at: input.evaluated_at,
  });

  for (const candidate of individualCandidates) {
    if (escalatedAlertIds.has(candidate.alert.id)) {
      continue;
    }

    const result = await createIncidentFromAlerts(admin, {
      alerts: [candidate.alert],
      reason: candidate.reason,
      integration_id: integrationIdFromAlert(candidate.alert, input.context),
    });

    if (!result.ok) {
      if (result.eventEmitted) {
        eventsEmitted += 1;
      }
      continue;
    }

    if (result.created) {
      incidentsCreated += 1;
    }

    alertsLinked += 1;
    escalatedAlertIds.add(candidate.alert.id);
    candidate.alert.incident_id = result.incident.id;
    if (result.eventEmitted) {
      eventsEmitted += 1;
    }
  }

  alerts = await loadEscalationAlerts(admin);

  const rollupCandidates = findRollupEscalationCandidates({
    alerts,
    evaluated_at: input.evaluated_at,
    exclude_alert_ids: escalatedAlertIds,
  });

  if (rollupCandidates.length >= 3) {
    const rollupAlerts = rollupCandidates.map((candidate) => candidate.alert);
    const result = await createIncidentFromAlerts(admin, {
      alerts: rollupAlerts,
      reason: "critical_rollup",
      integration_id: integrationIdFromAlert(rollupAlerts[0], input.context),
    });

    if (!result.ok) {
      if (result.eventEmitted) {
        eventsEmitted += 1;
      }
    } else {
      if (result.created) {
        incidentsCreated += 1;
      }
      alertsLinked += rollupAlerts.length;
      for (const alert of rollupAlerts) {
        escalatedAlertIds.add(alert.id);
        alert.incident_id = result.incident.id;
      }
      if (result.eventEmitted) {
        eventsEmitted += 1;
      }
    }
  }

  const openIncidents = await loadOpenIncidents(admin);
  for (const incident of openIncidents) {
    const linked = await loadLinkedAlerts(admin, incident.id);
    if (linked.length === 0) {
      continue;
    }

    const impactResult = await updateIncidentImpactFromAlerts(admin, {
      incident,
      alerts: linked,
    });

    if (impactResult.updated) {
      incidentsUpdated += 1;
      if (impactResult.eventEmitted) {
        eventsEmitted += 1;
      }
    }
  }

  const suggestResolveIncidentIds = await checkRecoveryIncidentSuggestions(admin);

  return {
    incidentsCreated,
    incidentsUpdated,
    alertsLinked,
    eventsEmitted,
    suggestResolveIncidentIds,
  };
}
