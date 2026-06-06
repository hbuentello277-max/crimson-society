import type { NexusIncidentStatus, NexusSeverity, NexusWarRoomStatus } from "@/lib/nexus/constants";

export type WarRoomDbRow = {
  id: string;
  incident_id: string;
  title: string;
  status: NexusWarRoomStatus;
  severity: NexusSeverity;
  impact_summary: string | null;
  root_cause: string | null;
  resolution_summary: string | null;
  owner_notes: string | null;
  timeline: Array<Record<string, unknown>>;
  recommended_actions: Array<Record<string, unknown>>;
  activated_at: string;
  stabilized_at: string | null;
  resolved_at: string | null;
  archived_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NexusWarRoomSummaryRow = {
  id: string;
  incident_id: string;
  title: string;
  status: NexusWarRoomStatus;
  severity: NexusSeverity;
  impact_summary: string | null;
  activated_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  incident_status: NexusIncidentStatus | null;
  incident_title: string | null;
  linked_alert_count: number;
  linked_observation_count: number;
  suggest_followup: boolean;
};

export type NexusWarRoomsSummary = {
  collected_at: string;
  counts: {
    open: number;
    active: number;
    resolved: number;
    archived: number;
  };
  open: NexusWarRoomSummaryRow[];
  recent_history: NexusWarRoomSummaryRow[];
};

export type WarRoomLinkedAlert = {
  id: string;
  title: string;
  severity: string;
  status: string;
  category: string;
  updated_at: string;
};

export type WarRoomLinkedObservation = {
  id: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  confidence: number;
  occurred_at: string;
};

export type WarRoomEventRow = {
  id: string;
  source: string;
  category: string;
  event_type: string;
  severity: string;
  title: string;
  description: string | null;
  occurred_at: string;
};

export type WarRoomInfrastructureSnapshot = {
  captured_at: string;
  system_status: string;
  integrations: Array<{
    slug: string;
    display_name: string;
    status: string;
    latency_ms: number | null;
  }>;
};

export type WarRoomWorkflowSnapshot = {
  captured_at: string;
  score: number | null;
  status: string;
  workflows: Array<{
    slug: string;
    display_name: string;
    workflow_status: string;
    workflow_score: number | null;
  }>;
};

export type NexusWarRoomDetail = {
  collected_at: string;
  war_room: WarRoomDbRow;
  incident: {
    id: string;
    title: string;
    status: NexusIncidentStatus;
    severity: NexusSeverity;
    started_at: string;
    resolved_at: string | null;
    root_cause: string | null;
    impact_summary: string | null;
    timeline: Array<Record<string, unknown>>;
    metadata: Record<string, unknown>;
  };
  linked_alerts: WarRoomLinkedAlert[];
  linked_observations: WarRoomLinkedObservation[];
  infrastructure_snapshot: WarRoomInfrastructureSnapshot | null;
  workflow_snapshot: WarRoomWorkflowSnapshot | null;
  current_infrastructure: WarRoomInfrastructureSnapshot | null;
  current_workflows: WarRoomWorkflowSnapshot | null;
  events: WarRoomEventRow[];
  timeline: Array<Record<string, unknown>>;
};

export type CreateWarRoomResult =
  | { ok: true; war_room: WarRoomDbRow; created: boolean }
  | { ok: false; error: string; code?: "duplicate" | "not_found" | "invalid" };

export type UpdateWarRoomResult =
  | { ok: true; war_room_id: string; event_emitted: boolean }
  | { ok: false; error: string };
