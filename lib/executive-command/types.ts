import type { NexusActionCardSummary } from "@/lib/action-center/types";
import type { FounderTimelineEntry } from "@/lib/founder-copilot/types";
import type { LaunchReadiness } from "@/lib/proactive-intelligence/types";
import type { OperationsPlan } from "@/lib/operations-planner/types";
import type { PlatformRingStatus } from "@/lib/nexus/founder-derive";

export const NEXUS_CURRENT_PHASE = 14;

export type ExecutiveUrgency = "critical" | "high" | "medium" | "low";

export type ExecutiveRiskOpportunity = {
  id: string;
  title: string;
  summary: string;
  related_route: string;
};

export type ExecutiveSummary = {
  overall_platform_status: PlatformRingStatus;
  platform_status_label: string;
  launch_readiness_score: number;
  launch_readiness_status: LaunchReadiness["status"];
  top_risk: ExecutiveRiskOpportunity | null;
  top_opportunity: ExecutiveRiskOpportunity | null;
  recommended_focus_today: string;
};

export type ExecutivePlatformHealth = {
  platform_status: string;
  platform_health_score: number | null;
  platform_health_status: string;
  failed_jobs: number;
  open_alerts: number;
  critical_alerts: number;
  recent_incidents: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    href: string;
  }>;
};

export type ExecutiveBusinessHealth = {
  revenue_status: string;
  estimated_mrr: number | null;
  estimated_arr: number | null;
  blackcard_growth: string;
  blackcard_active_members: number | null;
  membership_growth: string;
  total_members: number | null;
  new_members_this_week: number | null;
  shop_activity: string;
  shop_orders_24h: number | null;
  shop_paid_orders_24h: number | null;
  credits_activity: string;
  active_rewards: number | null;
  redemptions_this_week: number | null;
  credit_transactions_this_week: number | null;
};

export type ExecutiveOperationsPlanner = {
  available: boolean;
  recommended_plan: OperationsPlan | null;
  trigger: "risk" | "opportunity" | "launch_blocker" | null;
};

export type ExecutiveActionCenter = {
  pending_approvals: number;
  draft_actions: number;
  approved_awaiting_execution: number;
  recent_items: NexusActionCardSummary[];
};

export type ExecutiveFounderMemory = {
  recent_decisions: FounderTimelineEntry[];
  current_blockers: FounderTimelineEntry[];
  completed_milestones: FounderTimelineEntry[];
  current_nexus_phase: number;
};

export type ExecutivePriority = {
  id: string;
  title: string;
  reason: string;
  suggested_next_action: string;
  urgency: ExecutiveUrgency;
  related_route: string;
};

export type ExecutiveCommandSummary = {
  collected_at: string;
  readOnly: true;
  executive_summary: ExecutiveSummary;
  platform_health: ExecutivePlatformHealth;
  business_health: ExecutiveBusinessHealth;
  operations_planner: ExecutiveOperationsPlanner;
  action_center: ExecutiveActionCenter;
  founder_memory: ExecutiveFounderMemory;
  todays_priorities: ExecutivePriority[];
  partial?: boolean;
  warnings?: string[];
};
