import type { ForecastItem } from "@/lib/forecasting/types";
import type { ScenarioType } from "@/lib/scenarios/types";

export const SCENARIO_SCORE_WEIGHTS = {
  expected_benefit: 0.35,
  strategic_impact: 0.3,
  confidence: 0.25,
  risk_penalty: 0.1,
} as const;

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeScenarioScore(input: {
  expected_benefit: number;
  expected_risk: number;
  confidence_score: number | null;
  strategic_impact: number;
}): number {
  const confidence = input.confidence_score ?? 45;
  const riskAdjusted =
    input.expected_benefit * SCENARIO_SCORE_WEIGHTS.expected_benefit +
    input.strategic_impact * SCENARIO_SCORE_WEIGHTS.strategic_impact +
    confidence * SCENARIO_SCORE_WEIGHTS.confidence -
    input.expected_risk * SCENARIO_SCORE_WEIGHTS.risk_penalty;

  return clampScore(riskAdjusted);
}

export function scenarioTypeLabel(type: ScenarioType): string {
  const labels: Record<ScenarioType, string> = {
    growth: "Growth Focus",
    revenue: "Revenue Focus",
    engagement: "Engagement Focus",
    operations: "Operations Focus",
  };
  return labels[type];
}

export function focusBoost(baseScore: number, focused: boolean, secondary = false): number {
  if (!focused) return clampScore(baseScore * (secondary ? 0.92 : 0.88));
  return clampScore(Math.min(100, baseScore * 1.12));
}

export function forecastNumericAt90d(forecast: ForecastItem | undefined): number | null {
  if (!forecast?.available) return null;
  const point = forecast.timeline.find((entry) => entry.horizon_days === 90);
  return point?.numeric_value ?? null;
}

export function averageConfidence(forecasts: Array<ForecastItem | undefined>): number | null {
  const values = forecasts
    .filter((forecast): forecast is ForecastItem => Boolean(forecast?.available))
    .map((forecast) => forecast.confidence_score)
    .filter((score): score is number => score != null);

  if (values.length === 0) return null;
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function riskFromForecasts(forecasts: Array<ForecastItem | undefined>, stress: boolean): number {
  const risks = forecasts
    .filter((forecast): forecast is ForecastItem => Boolean(forecast?.available))
    .map((forecast) => forecast.risk_score);

  if (risks.length === 0) return stress ? 65 : 50;
  const average = risks.reduce((sum, value) => sum + value, 0) / risks.length;
  return clampScore(average + (stress ? 8 : 0));
}

export function benefitFromImpact(impact: number, confidence: number | null): number {
  const confidenceFactor = (confidence ?? 50) / 100;
  return clampScore(impact * 0.7 + confidenceFactor * 30);
}

export function formatProjectionValue(value: number | null, formatter: (v: number) => string): string {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  return formatter(value);
}

export function formatPercentDelta(base: number | null, boost: number): string {
  if (base == null) return "Unavailable";
  const adjusted = base * boost;
  const delta = ((adjusted - base) / Math.max(base, 1)) * 100;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}% vs baseline`;
}

export function formatCount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  return Math.round(value).toLocaleString();
}

export function formatCurrency(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatScore(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  return `${Math.round(value)}/100`;
}
