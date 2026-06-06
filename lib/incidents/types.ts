import type { NexusOwnerNote } from "@/lib/alerts/types";
import type { NexusIncidentStatus, NexusSeverity } from "@/lib/nexus/constants";

export type IncidentDbRow = {
  id: string;
  title: string;
  status: NexusIncidentStatus;
  severity: NexusSeverity;
  integration_id: string | null;
  started_at: string;
  resolved_at: string | null;
  root_cause: string | null;
  impact_summary: string | null;
  timeline: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EscalationAlertRow = {
  id: string;
  rule_id: string | null;
  category: string;
  severity: NexusSeverity;
  status: string;
  title: string;
  message: string;
  dedupe_key: string | null;
  incident_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};

export type EscalationReason =
  | "critical_high_impact"
  | "high_impact"
  | "integration_down_duration"
  | "mission_score_duration"
  | "critical_rollup";

export type EscalationCandidate = {
  alert: EscalationAlertRow;
  reason: EscalationReason;
  impact_score: number;
};

export type IncidentEscalationResult = {
  incidentsCreated: number;
  incidentsUpdated: number;
  alertsLinked: number;
  eventsEmitted: number;
  suggestResolveIncidentIds: string[];
};

export type NexusIncidentSummaryRow = {
  id: string;
  title: string;
  status: NexusIncidentStatus;
  severity: NexusSeverity;
  impact_score: number;
  integration_id: string | null;
  linked_alert_count: number;
  started_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  root_cause: string | null;
  impact_summary: string | null;
  owner_notes_count: number;
  metadata: {
    escalation_reason?: string | null;
    suggest_resolve?: boolean;
    correlation_id?: string | null;
  };
};

export type NexusIncidentsSummary = {
  collected_at: string;
  counts: {
    open: number;
    investigating: number;
    mitigated: number;
    resolved: number;
    postmortem: number;
  };
  open: NexusIncidentSummaryRow[];
  recent_history: NexusIncidentSummaryRow[];
};

export type IncidentOwnerNote = NexusOwnerNote;

export type IncidentDbStatus = NexusIncidentStatus;
