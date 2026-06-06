import type { NexusMissionWorkflowSlug } from "@/lib/nexus/constants";

export type MissionWorkflowSlug = NexusMissionWorkflowSlug;

export type MissionCheckStatus = "pass" | "warn" | "fail";

export type MissionCheckMethod = "synthetic" | "db_signal" | "event_rate";

export type MissionWorkflowDbStatus = "healthy" | "degraded" | "failing" | "unknown";

export type MissionHealthStatus =
  | "nominal"
  | "degraded"
  | "impaired"
  | "critical"
  | "unknown";

export type MissionCheckResult = {
  workflow_slug: MissionWorkflowSlug;
  status: MissionCheckStatus;
  check_method: MissionCheckMethod;
  latency_ms: number | null;
  details: Record<string, unknown>;
  checked_at: string;
  workflow_score: number;
};

export type MissionWorkflowCheckSummary = {
  slug: MissionWorkflowSlug;
  display_name: string;
  category: string;
  weight: number;
  workflow_status: MissionWorkflowDbStatus;
  workflow_score: number;
  last_check_at: string | null;
  last_success_at: string | null;
  failure_count_1h: number;
  success_count_1h: number;
  success_rate_1h: number | null;
  check: MissionCheckResult | null;
};

export type MissionHealthSummary = {
  score: number;
  status: MissionHealthStatus;
  checked_at: string | null;
  mission_critical: boolean;
  workflows: MissionWorkflowCheckSummary[];
};

export type NexusMissionHealthEngineResult = {
  ok: boolean;
  checkedAt: string;
  score: number;
  status: MissionHealthStatus;
  missionCritical: boolean;
  workflows: Array<{
    slug: MissionWorkflowSlug;
    status: MissionWorkflowDbStatus;
    workflow_score: number;
    check_status: MissionCheckStatus;
  }>;
  eventsEmitted: number;
  checksRecorded: number;
  error?: string;
};
