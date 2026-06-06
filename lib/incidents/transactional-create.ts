import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import {
  buildImpactSummary,
  buildIncidentSeverity,
  buildIncidentTitle,
  getAlertImpactScore,
} from "@/lib/incidents/escalation";
import { buildIncidentIdempotencyKey } from "@/lib/incidents/idempotency";
import type {
  CreateIncidentFromAlertsResult,
  CreateIncidentRpcResult,
  EscalationAlertRow,
  EscalationReason,
  IncidentDbRow,
} from "@/lib/incidents/types";

function maxImpactScore(alerts: EscalationAlertRow[]): number {
  return alerts.reduce((max, alert) => Math.max(max, getAlertImpactScore(alert)), 0);
}

async function fetchIncidentById(
  admin: SupabaseClient,
  incidentId: string,
): Promise<IncidentDbRow | null> {
  const { data, error } = await admin
    .from("nexus_incidents")
    .select(
      "id, title, status, severity, integration_id, started_at, resolved_at, root_cause, impact_summary, timeline, metadata, created_at, updated_at",
    )
    .eq("id", incidentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as IncidentDbRow;
}

export async function executeTransactionalIncidentCreate(
  admin: SupabaseClient,
  input: {
    alerts: EscalationAlertRow[];
    reason: EscalationReason;
    integration_id?: string | null;
    correlation_id?: string;
  },
): Promise<
  | {
      ok: true;
      incident: IncidentDbRow;
      created: boolean;
      idempotent: boolean;
      correlationId: string;
      alertIds: string[];
      impactScore: number;
      title: string;
      severity: "critical" | "warning";
    }
  | {
      ok: false;
      error: string;
      code?: string;
      correlationId: string;
      alertIds: string[];
    }
> {
  if (input.alerts.length === 0) {
    return {
      ok: false,
      error: "no_alerts",
      correlationId: input.correlation_id ?? randomUUID(),
      alertIds: [],
    };
  }

  const now = new Date().toISOString();
  const primary = input.alerts[0];
  const correlationId = input.correlation_id ?? randomUUID();
  const alertIds = input.alerts.map((alert) => alert.id);
  const idempotencyKey = buildIncidentIdempotencyKey(alertIds);
  const impactScore = maxImpactScore(input.alerts);
  const severity = buildIncidentSeverity(input.alerts);
  const title = buildIncidentTitle({
    reason: input.reason,
    primary_alert: primary,
    alert_count: input.alerts.length,
  });

  const metadata = safeProbeDetails({
    impact_score: impactScore,
    escalation_reason: input.reason,
    correlation_id: correlationId,
    idempotency_key: idempotencyKey,
    linked_alert_ids: alertIds,
    owner_notes: [],
    suggest_resolve: false,
  });

  const timeline = [
    {
      at: now,
      type: "created",
      reason: input.reason,
      alert_ids: alertIds,
    },
  ];

  const { data: rpcData, error: rpcError } = await admin.rpc("nexus_create_incident_from_alerts", {
    p_title: title,
    p_severity: severity,
    p_integration_id: input.integration_id ?? null,
    p_impact_summary: buildImpactSummary(input.reason),
    p_escalation_reason: input.reason,
    p_correlation_id: correlationId,
    p_idempotency_key: idempotencyKey,
    p_metadata: metadata,
    p_timeline: timeline,
    p_alert_ids: alertIds,
  });

  if (rpcError) {
    return {
      ok: false,
      error: rpcError.message,
      code: rpcError.code,
      correlationId,
      alertIds,
    };
  }

  const rpcResult = rpcData as CreateIncidentRpcResult;

  if (!rpcResult?.ok || !rpcResult.incident_id) {
    return {
      ok: false,
      error: rpcResult?.error ?? "incident_create_rpc_failed",
      code: rpcResult?.code,
      correlationId,
      alertIds,
    };
  }

  const incident = await fetchIncidentById(admin, rpcResult.incident_id);
  if (!incident) {
    return {
      ok: false,
      error: "incident_row_missing_after_rpc",
      correlationId,
      alertIds,
    };
  }

  return {
    ok: true,
    incident,
    created: rpcResult.created === true,
    idempotent: rpcResult.idempotent === true,
    correlationId,
    alertIds,
    impactScore,
    title,
    severity,
  };
}

export function toCreateIncidentFromAlertsResult(
  result: Awaited<ReturnType<typeof executeTransactionalIncidentCreate>>,
  eventEmitted: boolean,
): CreateIncidentFromAlertsResult {
  if (!result.ok) {
    return { ok: false, error: result.error, eventEmitted };
  }

  return {
    ok: true,
    incident: result.incident,
    created: result.created,
    idempotent: result.idempotent,
    eventEmitted,
  };
}
