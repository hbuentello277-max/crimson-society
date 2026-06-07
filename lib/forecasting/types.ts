export const FORECAST_CATEGORIES = [
  "membership",
  "blackcard",
  "revenue",
  "engagement",
  "operational",
  "risk",
] as const;

export type ForecastCategory = (typeof FORECAST_CATEGORIES)[number];

export type ForecastHorizon = 30 | 90 | 180;

export type ForecastItem = {
  id: string;
  category: ForecastCategory;
  title: string;
  current_value: string;
  projected_30d: string;
  projected_90d: string;
  projected_180d: string;
  confidence_score: number | null;
  risk_score: number;
  recommendation: string;
  generated_at: string;
  available: boolean;
  timeline: ForecastTimelinePoint[];
};

export type ForecastTimelinePoint = {
  horizon_days: ForecastHorizon;
  display: string;
  numeric_value: number | null;
};

export type ForecastSummary = {
  generated_at: string;
  headline: string;
  available_count: number;
  unavailable_count: number;
  average_confidence: number | null;
  highest_risk_category: ForecastCategory | null;
};

export type ForecastingResult = {
  generated_at: string;
  summary: ForecastSummary;
  forecasts: ForecastItem[];
  counts_by_category: Record<ForecastCategory, number>;
};

export type MetricTimeSeriesPoint = {
  period_start: string;
  value: number;
};

export type MetricTrendAnalysis = {
  metric_key: string;
  current: number;
  daily_rate: number;
  data_points: number;
  span_days: number;
  consistency: number;
  direction: "up" | "down" | "flat" | "unknown";
  available: boolean;
};

export type ForecastContext = {
  generated_at: string;
  metrics_collected_at: string | null;
  supporting_signal_count: number;
  trend_signals: {
    growth_up: boolean;
    revenue_up: boolean;
    engagement_up: boolean;
    operational_stress: boolean;
  };
};

export type ConfidenceInput = {
  data_points: number;
  span_days: number;
  consistency: number;
  supporting_signals: number;
};

export type RiskInput = {
  confidence: number | null;
  direction: "up" | "down" | "flat" | "unknown";
  operational_stress: boolean;
  category: ForecastCategory;
};
