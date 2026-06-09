import type { OperationsPlan } from "@/lib/operations-planner/types";

export type ExecutiveAccess = "owner" | "admin";

export type ExecutiveUrgency = "critical" | "high" | "medium" | "low";

export type ExecutiveSummary = {
  overall_platform_status: string;
  launch_readiness_score: number;
  launch_readiness_status: string;
  top_risk: string | null;
  top_opportunity: string | null;
  recommended_focus_today: string;
};

export type ExecutivePlatformHealth = {
  platform_status: string;
  platform_health: string;
  platform_health_score: number | null;
  failed_jobs: number;
  open_alerts: number;
  recent_incidents: Array<{ id: string; title: string; severity: string }>;
};

export type ExecutiveBusinessHealth = {
  revenue_status: string;
  estimated_mrr: number | null;
  blackcard_growth: string;
  blackcard_members: number | null;
  membership_growth: string;
  new_members_this_week: number | null;
  shop_activity: string;
  credits_activity: string;
};

export type ExecutiveOperationsPlanner = {
  available: boolean;
  plan: OperationsPlan | null;
};

export type ExecutiveActionCenter = {
  pending_approval: number;
  draft: number;
  approved_awaiting_execution: number;
  recent_titles: string[];
};

export type ExecutiveMemory = {
  recent_decisions: Array<{ title: string; summary: string }>;
  current_blockers: Array<{ title: string; summary: string }>;
  completed_milestones: Array<{ title: string; summary: string }>;
  current_phase: string;
};

export type ExecutivePriority = {
  id: string;
  title: string;
  reason: string;
  suggested_next_action: string;
  urgency: ExecutiveUrgency;
  href: string;
};

export type ExecutiveCommandSummary = {
  collected_at: string;
  access: ExecutiveAccess;
  executive_summary: ExecutiveSummary;
  platform_health: ExecutivePlatformHealth;
  business_health: ExecutiveBusinessHealth;
  operations_planner: ExecutiveOperationsPlanner;
  action_center: ExecutiveActionCenter;
  founder_memory: ExecutiveMemory;
  todays_priorities: ExecutivePriority[];
  readOnly: true;
  partial?: boolean;
  warnings?: string[];
};
