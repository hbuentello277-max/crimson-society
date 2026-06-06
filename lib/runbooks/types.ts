import type { NexusRunbookCategory, NexusRunbookStatus } from "@/lib/nexus/constants";
import type { NexusSeverity } from "@/lib/nexus/constants";

export type RunbookStep = {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
};

export type RunbookDbRow = {
  id: string;
  slug: string;
  title: string;
  category: NexusRunbookCategory;
  severity: NexusSeverity;
  description: string;
  trigger_types: string[];
  checklist: RunbookStep[];
  resolution_steps: RunbookStep[];
  verification_steps: RunbookStep[];
  owner_notes: string | null;
  status: NexusRunbookStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NexusRunbookSummaryRow = {
  id: string;
  slug: string;
  title: string;
  category: NexusRunbookCategory;
  severity: NexusSeverity;
  description: string;
  trigger_count: number;
  status: NexusRunbookStatus;
  updated_at: string;
  created_at: string;
};

export type NexusRunbooksSummary = {
  collected_at: string;
  counts: Record<NexusRunbookCategory | "all", number>;
  runbooks: NexusRunbookSummaryRow[];
};

export type NexusRunbookDetail = {
  collected_at: string;
  runbook: RunbookDbRow;
  related_alerts: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    category: string;
    updated_at: string;
  }>;
  related_incidents: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    updated_at: string;
  }>;
  related_war_rooms: Array<{
    id: string;
    title: string;
    status: string;
    incident_id: string;
    updated_at: string;
  }>;
};

export type RunbookSuggestionContext = {
  source: "alert" | "incident" | "observation" | "war_room";
  category?: string | null;
  severity?: string | null;
  rule_id?: string | null;
  integration_slug?: string | null;
  workflow_slug?: string | null;
  title?: string | null;
};

export type RunbookSuggestion = {
  id: string;
  slug: string;
  title: string;
  category: NexusRunbookCategory;
  severity: NexusSeverity;
  description: string;
  match_score: number;
  match_reasons: string[];
};

export type CreateRunbookInput = {
  slug: string;
  title: string;
  category: NexusRunbookCategory;
  severity: NexusSeverity;
  description: string;
  trigger_types?: string[];
  checklist?: RunbookStep[];
  resolution_steps?: RunbookStep[];
  verification_steps?: RunbookStep[];
  owner_notes?: string | null;
};

export type UpdateRunbookInput = Partial<CreateRunbookInput> & {
  status?: NexusRunbookStatus;
};
