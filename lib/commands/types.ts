import type { NexusCommandStatus } from "@/lib/nexus/constants";

export type CommandRiskLevel = "low" | "medium" | "high";

export type CommandOrigin = "owner" | "system" | "observation" | "alert" | "ai";

export type CommandDbRow = {
  id: string;
  command_type: string;
  title: string;
  summary: string;
  status: NexusCommandStatus;
  risk_level: CommandRiskLevel;
  source: CommandOrigin;
  recommended_action: string;
  evidence: Record<string, unknown>;
  related_alert_id: string | null;
  related_incident_id: string | null;
  related_observation_id: string | null;
  related_war_room_id: string | null;
  related_runbook_id: string | null;
  expires_at: string | null;
  approval_required: boolean;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};

export type NexusCommandSummaryRow = {
  id: string;
  command_type: string;
  title: string;
  summary: string;
  status: NexusCommandStatus;
  risk_level: CommandRiskLevel;
  source: CommandOrigin;
  recommended_action: string;
  related_alert_id: string | null;
  related_incident_id: string | null;
  related_observation_id: string | null;
  related_war_room_id: string | null;
  related_runbook_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NexusCommandsSummary = {
  collected_at: string;
  counts: {
    suggested: number;
    pending_approval: number;
    approved: number;
    completed: number;
    closed: number;
  };
  commands: NexusCommandSummaryRow[];
};

export type CommandSuggestionDraft = {
  dedupe_key: string;
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
};

export type UpdateCommandStatusAction = "approve" | "reject" | "dismiss" | "complete";

export type UpdateCommandResult =
  | { ok: true; command: CommandDbRow; event_emitted: boolean }
  | { ok: false; error: string };
