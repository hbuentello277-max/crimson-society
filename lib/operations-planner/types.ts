import type { NexusActionType } from "@/lib/action-center/types";

export const OPERATIONS_PLAN_TYPES = [
  "growth",
  "revenue",
  "membership",
  "launch",
  "incident",
] as const;

export type OperationsPlanType = (typeof OPERATIONS_PLAN_TYPES)[number];

export const OPERATIONS_PLAN_STATUSES = [
  "draft",
  "pending_approval",
  "review_required",
] as const;

export type OperationsPlanStatus = (typeof OPERATIONS_PLAN_STATUSES)[number];

export type OperationsPlanPriority = "critical" | "high" | "medium" | "low";

export type OperationsPlanStep = {
  order: number;
  title: string;
  summary: string;
  suggested_action_type?: NexusActionType;
};

export type OperationsPlanRelatedItem = {
  id: string;
  title: string;
  summary: string;
};

export type OperationsPlanSuggestedDraft = {
  action_type: NexusActionType;
  title: string;
  reason: string;
};

export type OperationsPlan = {
  id: string;
  plan_type: OperationsPlanType;
  title: string;
  objective: string;
  priority: OperationsPlanPriority;
  confidence_score: number;
  estimated_impact_score: number;
  reason: string;
  steps: OperationsPlanStep[];
  related_risks: OperationsPlanRelatedItem[];
  related_opportunities: OperationsPlanRelatedItem[];
  suggested_action_drafts: OperationsPlanSuggestedDraft[];
  status: OperationsPlanStatus;
  created_by_label: string;
  created_by_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OperationsPlanSummary = {
  collected_at: string;
  plans: OperationsPlan[];
  readOnly: true;
};

export type GenerateOperationsPlanInput = {
  ownerId: string;
  planType?: OperationsPlanType;
  transcript?: string;
};

export type RecommendedOperationsPlan = {
  available: boolean;
  plan: OperationsPlan | null;
  trigger: "risk" | "opportunity" | "launch_blocker" | null;
  readOnly: true;
};
