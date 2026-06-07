import type { MetricTimeSeriesPoint, MetricTrendAnalysis } from "@/lib/forecasting/types";

const MIN_DATA_POINTS = 2;
const MIN_SPAN_DAYS = 3;

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, (end - start) / (24 * 60 * 60_000));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function trendConsistency(points: MetricTimeSeriesPoint[]): number {
  if (points.length < 2) return 0;

  const deltas: number[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!.value;
    const current = points[index]!.value;
    deltas.push(current - previous);
  }

  if (deltas.length === 0) return 0;

  const averageDelta = mean(deltas);
  const variance =
    deltas.reduce((sum, delta) => sum + (delta - averageDelta) ** 2, 0) / deltas.length;
  const stdDev = Math.sqrt(variance);
  const averageMagnitude = Math.max(Math.abs(averageDelta), 1);

  const normalizedVolatility = stdDev / averageMagnitude;
  return Math.max(0, Math.min(1, 1 - normalizedVolatility));
}

function linearDailyRate(points: MetricTimeSeriesPoint[]): number {
  if (points.length < 2) return 0;

  const origin = new Date(points[0]!.period_start).getTime();
  const samples = points.map((point) => ({
    t: (new Date(point.period_start).getTime() - origin) / (24 * 60 * 60_000),
    v: point.value,
  }));

  const n = samples.length;
  const sumT = samples.reduce((sum, sample) => sum + sample.t, 0);
  const sumV = samples.reduce((sum, sample) => sum + sample.v, 0);
  const sumTV = samples.reduce((sum, sample) => sum + sample.t * sample.v, 0);
  const sumTT = samples.reduce((sum, sample) => sum + sample.t * sample.t, 0);
  const denominator = n * sumTT - sumT * sumT;

  if (denominator === 0) {
    const spanDays = daysBetween(points[0]!.period_start, points[points.length - 1]!.period_start);
    if (spanDays <= 0) return 0;
    return (points[points.length - 1]!.value - points[0]!.value) / spanDays;
  }

  return (n * sumTV - sumT * sumV) / denominator;
}

export function analyzeMetricTrend(
  metricKey: string,
  points: MetricTimeSeriesPoint[],
): MetricTrendAnalysis {
  const sorted = [...points]
    .filter((point) => Number.isFinite(point.value))
    .sort(
      (a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime(),
    );

  if (sorted.length < MIN_DATA_POINTS) {
    return {
      metric_key: metricKey,
      current: sorted[0]?.value ?? 0,
      daily_rate: 0,
      data_points: sorted.length,
      span_days: 0,
      consistency: 0,
      direction: "unknown",
      available: false,
    };
  }

  const span_days = daysBetween(sorted[0]!.period_start, sorted[sorted.length - 1]!.period_start);
  const current = sorted[sorted.length - 1]!.value;
  const daily_rate = linearDailyRate(sorted);
  const consistency = trendConsistency(sorted);

  let direction: MetricTrendAnalysis["direction"] = "unknown";
  if (Math.abs(daily_rate) < 0.01) {
    direction = "flat";
  } else if (daily_rate > 0) {
    direction = "up";
  } else {
    direction = "down";
  }

  return {
    metric_key: metricKey,
    current,
    daily_rate,
    data_points: sorted.length,
    span_days,
    consistency,
    direction,
    available: sorted.length >= MIN_DATA_POINTS && span_days >= MIN_SPAN_DAYS,
  };
}

export function projectValue(
  trend: MetricTrendAnalysis,
  horizonDays: number,
  options?: { floor?: number; allow_negative?: boolean },
): number | null {
  if (!trend.available) return null;

  const floor = options?.floor ?? 0;
  const projected = trend.current + trend.daily_rate * horizonDays;

  if (!options?.allow_negative && projected < floor) {
    return floor;
  }

  return projected;
}

export function formatCount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Forecast unavailable";
  return `${Math.round(value)}`;
}

export function formatCurrency(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Forecast unavailable";
  return `$${Math.round(value)}`;
}

export function formatEngagementIndex(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Forecast unavailable";
  return `${Math.round(value)} activity index`;
}

export function formatOperationalScore(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Forecast unavailable";
  if (value >= 85) return "Stable";
  if (value >= 70) return "Moderate workflow attention";
  if (value >= 50) return "Elevated workflow risk";
  return "High operational risk";
}

export function formatRiskLevel(score: number): string {
  if (score >= 75) return "Elevated risk";
  if (score >= 50) return "Moderate risk";
  if (score >= 25) return "Low risk";
  return "Minimal risk";
}
