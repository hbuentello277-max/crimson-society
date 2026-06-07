export const CORRELATION_CATEGORIES = [
  "growth",
  "revenue",
  "engagement",
  "operations",
  "risk",
  "community",
  "blackcard",
  "platform_health",
] as const;

export type CorrelationCategory = (typeof CORRELATION_CATEGORIES)[number];

export const CORRELATION_WINDOWS = ["24h", "7d", "30d"] as const;

export type CorrelationWindow = (typeof CORRELATION_WINDOWS)[number];

export type CorrelationSort = "impact" | "confidence";

export type SignalDirection = "up" | "down" | "flat" | "unknown";

export type CorrelationSignal = {
  label: string;
  value: string;
  direction: SignalDirection;
  source: string;
  occurred_at: string;
};

export type CorrelationItem = {
  id: string;
  category: CorrelationCategory;
  title: string;
  summary: string;
  signals: CorrelationSignal[];
  confidence_score: number;
  impact_score: number;
  recommendation: string;
  related_routes: string[];
  time_window: CorrelationWindow;
  generated_at: string;
};

export type CorrelationRuleResult = CorrelationItem | null;

export type CorrelationsSummary = {
  generated_at: string;
  window: CorrelationWindow;
  counts_by_category: Record<CorrelationCategory, number>;
  correlations: CorrelationItem[];
};

export type MetricTrend = {
  current: number;
  previous: number | null;
};

export type CorrelationDeploymentRow = {
  id: string;
  deployment_id: string;
  environment: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  commit_message: string | null;
};

export type CorrelationMemoryRow = {
  id: string;
  entry_type: string;
  title: string;
  summary: string;
  occurred_at: string;
  importance_score: number;
};

export type CorrelationCommandRow = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
};

export type CorrelationContext = {
  generated_at: string;
  window: CorrelationWindow;
  window_start: string;
  window_end: string;
  metrics: Awaited<ReturnType<typeof import("@/lib/metrics/summary").getNexusMetricsSummary>>;
  health: Awaited<ReturnType<typeof import("@/lib/monitoring/health-summary").getNexusHealthSnapshot>>;
  mission: Awaited<ReturnType<typeof import("@/lib/mission-health/summary").getMissionHealthSnapshot>>;
  alerts: Awaited<ReturnType<typeof import("@/lib/alerts/summary").getNexusAlertsSummary>>;
  incidents: Awaited<ReturnType<typeof import("@/lib/incidents/summary").getNexusIncidentsSummary>>;
  observations: Awaited<ReturnType<typeof import("@/lib/observations/summary").getNexusObservationsSummary>>;
  commands: Awaited<ReturnType<typeof import("@/lib/commands/summary").getNexusCommandsSummary>>;
  trends: Record<string, MetricTrend>;
  deployments: CorrelationDeploymentRow[];
  memory_entries: CorrelationMemoryRow[];
  recent_commands: CorrelationCommandRow[];
  post_deployment_incidents: number;
  post_deployment_critical_alerts: number;
};
