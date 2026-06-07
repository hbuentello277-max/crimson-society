import type {
  NexusAutomationActionType,
  NexusAutomationStatus,
} from "@/lib/nexus/constants";

export type AutomationActionDbRow = {
  id: string;
  action_type: NexusAutomationActionType;
  title: string;
  summary: string;
  recommendation: string;
  source: string;
  status: NexusAutomationStatus;
  approval_required: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type AutomationActionSummaryRow = AutomationActionDbRow;

export type AutomationDraft = {
  action_type: NexusAutomationActionType;
  title: string;
  summary: string;
  recommendation: string;
  source: string;
  metadata: Record<string, unknown>;
};

export type NexusAutomationSummary = {
  collected_at: string;
  generation: AutomationGenerationResult;
  counts: Record<NexusAutomationStatus | "all", number>;
  counts_by_type: Record<NexusAutomationActionType, number>;
  actions: AutomationActionSummaryRow[];
};

export type AutomationGenerationResult = {
  ok: boolean;
  evaluated_at: string;
  drafts_considered: number;
  actions_created: number;
  actions_skipped: number;
  error?: string;
};

export type UpdateAutomationStatusAction = "approve" | "reject" | "archive";

export type UpdateAutomationResult =
  | { ok: true; action: AutomationActionDbRow; event_emitted: boolean }
  | { ok: false; error: string };
