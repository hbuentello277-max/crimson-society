import type { CommandDbRow, CommandOrigin, CommandRiskLevel } from "@/lib/commands/types";

function asRiskLevel(value: string): CommandRiskLevel {
  if (value === "high" || value === "medium") {
    return value;
  }
  return "low";
}

export function mapCommandRow(row: Record<string, unknown>): CommandDbRow {
  const payload = (row.payload as Record<string, unknown>) ?? {};
  const metadata = (row.metadata as Record<string, unknown>) ?? {};

  return {
    id: row.id as string,
    command_type: row.command_type as string,
    title: row.title as string,
    summary: row.description as string,
    status: row.status as CommandDbRow["status"],
    risk_level: asRiskLevel(row.risk_level as string),
    source: row.origin as CommandOrigin,
    recommended_action:
      typeof payload.recommended_action === "string"
        ? payload.recommended_action
        : (row.description as string),
    evidence:
      payload.evidence && typeof payload.evidence === "object"
        ? (payload.evidence as Record<string, unknown>)
        : {},
    related_alert_id: (row.alert_id as string | null) ?? null,
    related_incident_id: (row.incident_id as string | null) ?? null,
    related_observation_id: (row.observation_id as string | null) ?? null,
    related_war_room_id: (row.war_room_id as string | null) ?? null,
    related_runbook_id: (row.runbook_id as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    approval_required: row.approval_required === true,
    approved_at: (row.approved_at as string | null) ?? null,
    approved_by: (row.approved_by as string | null) ?? null,
    rejected_at: (row.rejected_at as string | null) ?? null,
    rejected_by: (row.rejected_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    metadata,
  };
}

export function commandInsertRow(draft: {
  command_type: string;
  title: string;
  summary: string;
  risk_level: CommandRiskLevel;
  source: CommandOrigin;
  recommended_action: string;
  evidence: Record<string, unknown>;
  related_alert_id?: string | null;
  related_incident_id?: string | null;
  related_observation_id?: string | null;
  related_war_room_id?: string | null;
  related_runbook_id?: string | null;
  expires_at?: string | null;
  dedupe_key: string;
  status: CommandDbRow["status"];
}) {
  return {
    command_type: draft.command_type,
    title: draft.title,
    description: draft.summary,
    status: draft.status,
    origin: draft.source,
    risk_level: draft.risk_level,
    approval_required: draft.risk_level === "high",
    alert_id: draft.related_alert_id ?? null,
    incident_id: draft.related_incident_id ?? null,
    observation_id: draft.related_observation_id ?? null,
    war_room_id: draft.related_war_room_id ?? null,
    runbook_id: draft.related_runbook_id ?? null,
    expires_at: draft.expires_at ?? null,
    payload: {
      recommended_action: draft.recommended_action,
      evidence: draft.evidence,
    },
    metadata: {
      dedupe_key: draft.dedupe_key,
      mark: "mark_i_suggestion",
    },
  };
}
