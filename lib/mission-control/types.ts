export const MISSION_STATUSES = [
  "dominating",
  "growing",
  "stable",
  "at_risk",
  "critical",
] as const;

export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_THREAT_SEVERITIES = ["critical", "high", "medium", "low"] as const;

export type MissionThreatSeverity = (typeof MISSION_THREAT_SEVERITIES)[number];

export type MissionObjectiveView = {
  id: string;
  horizon: "current" | "weekly" | "monthly";
  title: string;
  summary: string;
  on_track: boolean | null;
  recommendation: string;
  related_routes: string[];
};

export type MissionThreat = {
  id: string;
  title: string;
  summary: string;
  severity: MissionThreatSeverity;
  recommendation: string;
  related_routes: string[];
};

export type MissionAccelerator = {
  id: string;
  label: string;
  summary: string;
  influence_score: number;
  related_routes: string[];
};

export type MissionHistoryItem = {
  id: string;
  entry_type: string;
  title: string;
  summary: string;
  occurred_at: string;
  source: string;
};

export type PlatformJobHealthView = {
  slug: string;
  label: string;
  path: string;
  schedule: string;
  status: "healthy" | "failed" | "overdue" | "never_run" | "unknown";
  last_run_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  next_expected_at: string;
};

export type PlatformJobsSummaryView = {
  generated_at: string;
  overall_status: "healthy" | "degraded" | "critical" | "unknown";
  healthy_count: number;
  failed_count: number;
  overdue_count: number;
  never_run_count: number;
  last_nexus_run_at: string | null;
  jobs: PlatformJobHealthView[];
};

export type MissionControlSummary = {
  generated_at: string;
  mission_status: MissionStatus;
  mission_score: number;
  primary_focus: string;
  secondary_focus: string;
  top_threat: string;
  top_opportunity: string;
  mission_summary: string;
  objectives: MissionObjectiveView[];
  threats: MissionThreat[];
  accelerators: MissionAccelerator[];
  recent_history: MissionHistoryItem[];
  score_breakdown: Record<string, number>;
  platform_jobs: PlatformJobsSummaryView;
};

export type MissionHealthComponents = {
  growth: number;
  engagement: number;
  revenue: number;
  operational_health: number;
  workflow_health: number;
  incident_penalty: number;
  alert_penalty: number;
  opportunity_boost: number;
};
