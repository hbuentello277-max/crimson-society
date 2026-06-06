import type { NexusSeverity } from "@/lib/nexus/constants";

export type AlertRuleKind = "firing" | "recovery";

export type AlertDbStatus = "active" | "acknowledged" | "resolved" | "suppressed";

export type AlertRuleRow = {
  id: string;
  rule_id: string;
  name: string;
  category: string;
  severity: NexusSeverity;
  condition: RuleCondition;
  enabled: boolean;
  cooldown_minutes: number;
  metadata: Record<string, unknown>;
};

export type RuleCondition = {
  type: string;
  status?: string;
  slug?: string;
  integration_slug?: string;
  metric_key?: string;
  source?: string;
  field?: string;
  operator?: string;
  value?: number;
  window_minutes?: number;
  window_hours?: number;
  window_days?: number;
  duration_minutes?: number;
  environment?: string;
  paired_rule_id?: string;
};

export type ScopeState = {
  last_status?: string;
  last_value?: number | null;
  bad_since?: string | null;
  streak?: number;
  was_bad?: boolean;
};

export type IntegrationSnapshot = {
  id: string;
  slug: string;
  status: string;
  last_check_at: string | null;
};

export type WorkflowSnapshot = {
  id: string;
  slug: string;
  display_name: string;
  status: string;
  last_check_at: string | null;
};

export type MetricSnapshot = {
  value: number;
  previous_value: number | null;
  period_start: string;
};

export type DeploymentSnapshot = {
  id: string;
  environment: string;
  status: string;
  started_at: string;
};

export type AlertEvaluationContext = {
  evaluated_at: string;
  integrations: Record<string, IntegrationSnapshot>;
  mission_workflows: Record<string, WorkflowSnapshot>;
  mission_score: number | null;
  metrics: Record<string, MetricSnapshot>;
  metric_history: Record<string, MetricSnapshot[]>;
  deployments: DeploymentSnapshot[];
  derived: Record<string, number | null>;
  evaluation_state: Record<string, ScopeState>;
};

export type RuleMatch = {
  rule: AlertRuleRow;
  scope: string;
  scope_id: string;
  title: string;
  message: string;
  evidence: Record<string, unknown>;
  integration_id?: string | null;
};

export type RuleEvaluationOutcome =
  | { kind: "match"; match: RuleMatch }
  | { kind: "no_match" }
  | { kind: "skipped"; reason: string };

export type AlertCandidate = {
  rule: AlertRuleRow;
  scope: string;
  scope_id: string;
  dedupe_key: string;
  category: string;
  severity: NexusSeverity;
  title: string;
  message: string;
  evidence: Record<string, unknown>;
  impact_score: number;
  integration_id?: string | null;
  event_id?: string | null;
};

export type RecoveryCandidate = {
  paired_rule_id: string;
  scope: string;
  scope_id: string;
  dedupe_key: string;
  recovery_dedupe_key: string;
  title: string;
  message: string;
  previous_status: string;
  current_status: string;
  duration_minutes: number;
  original_alert_id: string | null;
  evidence: Record<string, unknown>;
};

export type NexusOwnerNote = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  deleted_at?: string | null;
};

export type NexusAlertEngineResult = {
  ok: boolean;
  evaluatedAt: string;
  rulesEvaluated: number;
  rulesSkipped: Array<{ rule_id: string; reason: string }>;
  alertsCreated: number;
  alertsUpdated: number;
  alertsResolved: number;
  recoveriesEmitted: number;
  eventsEmitted: number;
  error?: string;
};

export type NexusAlertsSummary = {
  collected_at: string;
  counts: {
    critical: number;
    warning: number;
    info: number;
    recovery: number;
    active: number;
  };
  active: NexusAlertSummaryRow[];
  recent_history: NexusAlertSummaryRow[];
};

export type NexusAlertSummaryRow = {
  id: string;
  rule_id: string | null;
  category: string;
  severity: NexusSeverity;
  status: AlertDbStatus;
  title: string;
  message: string;
  dedupe_key: string | null;
  impact_score: number;
  incident_id: string | null;
  created_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  owner_notes_count: number;
  metadata: Record<string, unknown>;
};
