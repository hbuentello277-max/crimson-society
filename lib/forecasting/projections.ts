import type {
  ForecastHorizon,
  ForecastItem,
  ForecastTimelinePoint,
  MetricTrendAnalysis,
} from "@/lib/forecasting/types";
import {
  formatCount,
  formatCurrency,
  formatEngagementIndex,
  formatOperationalScore,
  formatRiskLevel,
  projectValue,
} from "@/lib/forecasting/trends";
import {
  computeConfidenceScore,
  computeRiskScore,
  recommendationForBlackcard,
  recommendationForEngagement,
  recommendationForMembership,
  recommendationForOperational,
  recommendationForRevenue,
  recommendationForRisk,
} from "@/lib/forecasting/scoring";

const HORIZONS: ForecastHorizon[] = [30, 90, 180];

function buildTimeline(
  trend: MetricTrendAnalysis,
  formatter: (value: number | null) => string,
  options?: { floor?: number },
): ForecastTimelinePoint[] {
  return HORIZONS.map((horizon_days) => {
    const numeric_value = projectValue(trend, horizon_days, options);
    return {
      horizon_days,
      numeric_value,
      display: formatter(numeric_value),
    };
  });
}

function unavailableForecast(
  input: Pick<
    ForecastItem,
    | "id"
    | "category"
    | "title"
    | "confidence_score"
    | "risk_score"
    | "recommendation"
    | "generated_at"
  >,
): ForecastItem {
  return {
    ...input,
    available: false,
    current_value: "Forecast unavailable",
    projected_30d: "Forecast unavailable",
    projected_90d: "Forecast unavailable",
    projected_180d: "Forecast unavailable",
    timeline: HORIZONS.map((horizon_days) => ({
      horizon_days,
      numeric_value: null,
      display: "Forecast unavailable",
    })),
  };
}

function buildNumericForecast(input: {
  id: string;
  category: ForecastItem["category"];
  title: string;
  trend: MetricTrendAnalysis;
  supporting_signals: number;
  operational_stress: boolean;
  generated_at: string;
  currentFormatter: (value: number) => string;
  projectionFormatter: (value: number | null) => string;
  recommendation: string;
  projectionOptions?: { floor?: number };
}): ForecastItem {
  if (!input.trend.available) {
    return unavailableForecast({
      id: input.id,
      category: input.category,
      title: input.title,
      confidence_score: null,
      risk_score: computeRiskScore({
        confidence: null,
        direction: input.trend.direction,
        operational_stress: input.operational_stress,
        category: input.category,
      }),
      recommendation: input.recommendation,
      generated_at: input.generated_at,
    });
  }

  const timeline = buildTimeline(input.trend, input.projectionFormatter, input.projectionOptions);
  const confidence_score = computeConfidenceScore({
    data_points: input.trend.data_points,
    span_days: input.trend.span_days,
    consistency: input.trend.consistency,
    supporting_signals: input.supporting_signals,
  });

  const risk_score = computeRiskScore({
    confidence: confidence_score,
    direction: input.trend.direction,
    operational_stress: input.operational_stress,
    category: input.category,
  });

  return {
    id: input.id,
    category: input.category,
    title: input.title,
    current_value: input.currentFormatter(input.trend.current),
    projected_30d: timeline[0]!.display,
    projected_90d: timeline[1]!.display,
    projected_180d: timeline[2]!.display,
    confidence_score,
    risk_score,
    recommendation: input.recommendation,
    generated_at: input.generated_at,
    available: true,
    timeline,
  };
}

export function buildMembershipForecast(input: {
  trend: MetricTrendAnalysis;
  supporting_signals: number;
  operational_stress: boolean;
  generated_at: string;
}): ForecastItem {
  return buildNumericForecast({
    id: "forecast:membership",
    category: "membership",
    title: "Membership Forecast",
    trend: input.trend,
    supporting_signals: input.supporting_signals,
    operational_stress: input.operational_stress,
    generated_at: input.generated_at,
    currentFormatter: (value) => `${Math.round(value)} members`,
    projectionFormatter: (value) =>
      value == null ? "Forecast unavailable" : `${Math.round(value)} members`,
    recommendation: recommendationForMembership(input.trend.direction, input.trend.available),
    projectionOptions: { floor: 0 },
  });
}

export function buildBlackcardForecast(input: {
  trend: MetricTrendAnalysis;
  supporting_signals: number;
  operational_stress: boolean;
  generated_at: string;
}): ForecastItem {
  return buildNumericForecast({
    id: "forecast:blackcard",
    category: "blackcard",
    title: "Blackcard Forecast",
    trend: input.trend,
    supporting_signals: input.supporting_signals,
    operational_stress: input.operational_stress,
    generated_at: input.generated_at,
    currentFormatter: (value) => `${Math.round(value)} members`,
    projectionFormatter: (value) =>
      value == null ? "Forecast unavailable" : `${Math.round(value)} members`,
    recommendation: recommendationForBlackcard(input.trend.direction, input.trend.available),
    projectionOptions: { floor: 0 },
  });
}

export function buildRevenueForecast(input: {
  trend: MetricTrendAnalysis;
  supporting_signals: number;
  operational_stress: boolean;
  generated_at: string;
}): ForecastItem {
  return buildNumericForecast({
    id: "forecast:revenue",
    category: "revenue",
    title: "Revenue Forecast",
    trend: input.trend,
    supporting_signals: input.supporting_signals,
    operational_stress: input.operational_stress,
    generated_at: input.generated_at,
    currentFormatter: (value) => formatCurrency(value),
    projectionFormatter: formatCurrency,
    recommendation: recommendationForRevenue(input.trend.direction, input.trend.available),
    projectionOptions: { floor: 0 },
  });
}

export function buildEngagementForecast(input: {
  postsTrend: MetricTrendAnalysis;
  meetsTrend: MetricTrendAnalysis;
  messagesTrend: MetricTrendAnalysis;
  supporting_signals: number;
  operational_stress: boolean;
  generated_at: string;
}): ForecastItem {
  const availableTrends = [input.postsTrend, input.meetsTrend, input.messagesTrend].filter(
    (trend) => trend.available,
  );

  if (availableTrends.length === 0) {
    return unavailableForecast({
      id: "forecast:engagement",
      category: "engagement",
      title: "Engagement Forecast",
      confidence_score: null,
      risk_score: computeRiskScore({
        confidence: null,
        direction: "unknown",
        operational_stress: input.operational_stress,
        category: "engagement",
      }),
      recommendation: recommendationForEngagement("unknown", false),
      generated_at: input.generated_at,
    });
  }

  const current =
    (input.postsTrend.available ? input.postsTrend.current : 0) +
    (input.meetsTrend.available ? input.meetsTrend.current : 0) +
    (input.messagesTrend.available ? input.messagesTrend.current : 0);

  const daily_rate =
    (input.postsTrend.available ? input.postsTrend.daily_rate : 0) +
    (input.meetsTrend.available ? input.meetsTrend.daily_rate : 0) +
    (input.messagesTrend.available ? input.messagesTrend.daily_rate : 0);

  const compositeTrend: MetricTrendAnalysis = {
    metric_key: "engagement.composite_weekly",
    current,
    daily_rate,
    data_points: Math.round(
      availableTrends.reduce((sum, trend) => sum + trend.data_points, 0) / availableTrends.length,
    ),
    span_days: Math.max(...availableTrends.map((trend) => trend.span_days)),
    consistency:
      availableTrends.reduce((sum, trend) => sum + trend.consistency, 0) / availableTrends.length,
    direction:
      daily_rate > 0.05 ? "up" : daily_rate < -0.05 ? "down" : daily_rate === 0 ? "flat" : "flat",
    available: true,
  };

  return buildNumericForecast({
    id: "forecast:engagement",
    category: "engagement",
    title: "Engagement Forecast",
    trend: compositeTrend,
    supporting_signals: input.supporting_signals,
    operational_stress: input.operational_stress,
    generated_at: input.generated_at,
    currentFormatter: (value) => formatEngagementIndex(value),
    projectionFormatter: formatEngagementIndex,
    recommendation: recommendationForEngagement(compositeTrend.direction, true),
    projectionOptions: { floor: 0 },
  });
}

export function buildOperationalForecast(input: {
  missionScoreTrend: MetricTrendAnalysis;
  supporting_signals: number;
  operational_stress: boolean;
  generated_at: string;
}): ForecastItem {
  if (!input.missionScoreTrend.available) {
    return unavailableForecast({
      id: "forecast:operational",
      category: "operational",
      title: "Operational Forecast",
      confidence_score: null,
      risk_score: computeRiskScore({
        confidence: null,
        direction: "unknown",
        operational_stress: input.operational_stress,
        category: "operational",
      }),
      recommendation: recommendationForOperational(50, false),
      generated_at: input.generated_at,
    });
  }

  const timeline = HORIZONS.map((horizon_days) => {
    const numeric_value = projectValue(input.missionScoreTrend, horizon_days, {
      floor: 0,
      allow_negative: false,
    });
    const bounded = numeric_value == null ? null : Math.min(100, Math.max(0, numeric_value));
    return {
      horizon_days,
      numeric_value: bounded,
      display: formatOperationalScore(bounded),
    };
  });

  const confidence_score = computeConfidenceScore({
    data_points: input.missionScoreTrend.data_points,
    span_days: input.missionScoreTrend.span_days,
    consistency: input.missionScoreTrend.consistency,
    supporting_signals: input.supporting_signals,
  });

  const risk_score = computeRiskScore({
    confidence: confidence_score,
    direction: input.missionScoreTrend.direction,
    operational_stress: input.operational_stress,
    category: "operational",
  });

  const currentScore = Math.min(100, Math.max(0, input.missionScoreTrend.current));

  return {
    id: "forecast:operational",
    category: "operational",
    title: "Operational Forecast",
    current_value: formatOperationalScore(currentScore),
    projected_30d: timeline[0]!.display,
    projected_90d: timeline[1]!.display,
    projected_180d: timeline[2]!.display,
    confidence_score,
    risk_score,
    recommendation: recommendationForOperational(risk_score, true),
    generated_at: input.generated_at,
    available: true,
    timeline,
  };
}

export function buildRiskForecast(input: {
  riskScore: number;
  confidence_score: number | null;
  operational_stress: boolean;
  direction: MetricTrendAnalysis["direction"];
  generated_at: string;
  available: boolean;
}): ForecastItem {
  if (!input.available) {
    return unavailableForecast({
      id: "forecast:risk",
      category: "risk",
      title: "Risk Forecast",
      confidence_score: null,
      risk_score: input.riskScore,
      recommendation: recommendationForRisk(input.riskScore, false),
      generated_at: input.generated_at,
    });
  }

  const drift = input.direction === "down" ? 8 : input.direction === "up" ? -4 : 3;
  const timeline = HORIZONS.map((horizon_days) => {
    const factor = horizon_days / 30;
    const projected = Math.min(100, Math.max(0, input.riskScore + drift * factor));
    return {
      horizon_days,
      numeric_value: projected,
      display: formatRiskLevel(projected),
    };
  });

  return {
    id: "forecast:risk",
    category: "risk",
    title: "Risk Forecast",
    current_value: formatRiskLevel(input.riskScore),
    projected_30d: timeline[0]!.display,
    projected_90d: timeline[1]!.display,
    projected_180d: timeline[2]!.display,
    confidence_score: input.confidence_score,
    risk_score: input.riskScore,
    recommendation: recommendationForRisk(input.riskScore, true),
    generated_at: input.generated_at,
    available: true,
    timeline,
  };
}

export { formatCount, formatCurrency };
