import type { NexusSeverity } from "@/lib/nexus/constants";

export type ObservationType =
  | "trend"
  | "anomaly"
  | "correlation"
  | "regression"
  | "milestone"
  | "summary"
  | "diagnosis";

export type ObservationDbStatus = "active" | "superseded" | "dismissed" | "confirmed";

export type ObservationRuleId =
  | "obs.mission.health.diagnosis"
  | "obs.infra.integration.diagnosis"
  | "obs.revenue.blackcard.mrr.summary"
  | "obs.growth.signups.trend"
  | "obs.infra.incidents.clear.summary"
  | "obs.deploy.correlation"
  | "obs.revenue.decline"
  | "obs.growth.users.milestone"
  | "obs.activity.push_failed.anomaly"
  | "obs.mission.health.regression";

export type ObservationRule = {
  rule_id: ObservationRuleId;
  name: string;
  category: string;
  observation_type: ObservationType;
  enabled: boolean;
};

export type MissionContextSnapshot = {
  score: number | null;
  status: "healthy" | "degraded" | "critical" | null;
  workflows: Record<string, { id: string; status: string; display_name: string; last_check_at: string | null }>;
  warning_workflows: string[];
  failing_workflows: string[];
};

export type IntegrationContextSnapshot = {
  id: string;
  slug: string;
  status: string;
  last_check_at: string | null;
  issues: string[];
};

export type MetricContextSnapshot = {
  id: string;
  value: number;
  previous_value: number | null;
  period_start: string;
};

export type AlertContextSnapshot = {
  id: string;
  rule_id: string | null;
  category: string;
  severity: NexusSeverity;
  title: string;
  status: string;
};

export type IncidentContextSnapshot = {
  id: string;
  severity: NexusSeverity;
  status: string;
  title: string;
};

export type EventContextSnapshot = {
  id: string;
  event_type: string;
  category: string;
  severity: NexusSeverity;
  occurred_at: string;
};

export type DeploymentContextSnapshot = {
  id: string;
  environment: string;
  status: string;
  started_at: string;
  commit_sha: string | null;
  commit_message: string | null;
};

export type ObservationEvaluationContext = {
  evaluated_at: string;
  mission: MissionContextSnapshot;
  integrations: Record<string, IntegrationContextSnapshot>;
  metrics: Record<string, MetricContextSnapshot>;
  metric_history: Record<string, Array<{ value: number; period_start: string }>>;
  alerts: {
    active: AlertContextSnapshot[];
    active_critical: number;
    active_warning: number;
    active_by_category: Record<string, number>;
  };
  incidents: {
    open: IncidentContextSnapshot[];
    open_critical: number;
    open_total: number;
    open_ids: string[];
  };
  recent_events: EventContextSnapshot[];
  latest_deployment: DeploymentContextSnapshot | null;
  prior_mission_score: number | null;
};

export type ObservationMatch = {
  rule: ObservationRule;
  scope: string;
  scope_id: string;
  observation_type: ObservationType;
  category: string;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  confidence_inputs: ConfidenceInputs;
  severity_inputs: SeverityInputs;
  valid_until: string | null;
  metric_refs: Array<{ snapshot_id: string; role: "baseline" | "current" | "comparison" }>;
  event_refs: Array<{ event_id: string; relevance: "primary" | "supporting" }>;
  alert_refs: Array<{ alert_id: string; relationship: "triggered_by" | "related" | "escalated_to" }>;
  incident_id?: string | null;
};

export type ConfidenceInputs = {
  rule_class:
    | "metric_trend"
    | "multi_workflow_diagnosis"
    | "integration_probe"
    | "absence_summary"
    | "revenue_summary"
    | "deploy_correlation"
    | "milestone"
    | "regression"
    | "anomaly";
  complete_evidence: boolean;
  partial_evidence: boolean;
  agreeing_signals: number;
  conflicting_signals: boolean;
  stale_data: boolean;
  low_sample_size: boolean;
  base_confidence?: number;
};

export type SeverityInputs = {
  rule_id: ObservationRuleId;
  mission_status: MissionContextSnapshot["status"];
  failing_member_workflows: number;
  degraded_integrations: number;
  open_critical_incidents: number;
  trend_direction?: "improving" | "declining" | "flat";
  is_absence_summary?: boolean;
  metric_delta_pct?: number;
  is_milestone?: boolean;
};

export type ObservationEvaluationOutcome =
  | { kind: "match"; match: ObservationMatch }
  | { kind: "no_match" }
  | { kind: "skipped"; reason: string };

export type ObservationCandidate = {
  rule: ObservationRule;
  dedupe_key: string;
  scope: string;
  scope_id: string;
  observation_type: ObservationType;
  category: string;
  severity: NexusSeverity;
  confidence: number;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  valid_until: string | null;
  occurred_at: string;
  metric_refs: ObservationMatch["metric_refs"];
  event_refs: ObservationMatch["event_refs"];
  alert_refs: ObservationMatch["alert_refs"];
  incident_id?: string | null;
};

export type NexusObservationEngineResult = {
  ok: boolean;
  evaluatedAt: string;
  rulesEvaluated: number;
  rulesSkipped: Array<{ rule_id: string; reason: string }>;
  observationsCreated: number;
  observationsSuperseded: number;
  observationsExpired: number;
  observationsCleaned: number;
  eventsEmitted: number;
  error?: string;
};

export type NexusObservationSummaryRow = {
  id: string;
  observation_type: ObservationType;
  category: string;
  severity: NexusSeverity;
  confidence: number;
  priority_score: number;
  title: string;
  summary: string;
  rule_id: string | null;
  status: ObservationDbStatus;
  occurred_at: string;
  valid_until: string | null;
  incident_id: string | null;
  linked_alerts_count: number;
  linked_metrics_count: number;
  priority_tier?: string;
  evidence: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NexusObservationsSummary = {
  collected_at: string;
  counts: {
    info: number;
    warning: number;
    critical: number;
    active: number;
  };
  active: NexusObservationSummaryRow[];
  recent_history: NexusObservationSummaryRow[];
};

export type ObservationEvidenceEventRef = {
  event_id: string;
  relevance: "primary" | "supporting";
  event_type: string;
  category: string;
  severity: NexusSeverity;
  title: string;
  occurred_at: string;
};

export type ObservationEvidenceMetricRef = {
  snapshot_id: string;
  role: "baseline" | "current" | "comparison";
  metric_key: string;
  value: number;
  previous_value: number | null;
  period_start: string;
};

export type ObservationEvidenceAlertRef = {
  alert_id: string;
  relationship: "triggered_by" | "related" | "escalated_to";
  title: string;
  severity: NexusSeverity;
  status: string;
  category: string;
};

export type NexusObservationDetail = NexusObservationSummaryRow & {
  source: string;
  dismissed_at: string | null;
  dismissed_by: string | null;
  superseded_by: string | null;
  war_room_id: string | null;
  owner_notes_count: number;
  evidence_links: {
    events: ObservationEvidenceEventRef[];
    metrics: ObservationEvidenceMetricRef[];
    alerts: ObservationEvidenceAlertRef[];
  };
};

export type ObservationsListView = "active" | "history" | "all";
