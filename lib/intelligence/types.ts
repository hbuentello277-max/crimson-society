import type { ReportContext } from "@/lib/reports/context";

export const INTELLIGENCE_CATEGORIES = [
  "growth",
  "revenue",
  "engagement",
  "operations",
  "risk",
  "opportunity",
] as const;

export type IntelligenceCategory = (typeof INTELLIGENCE_CATEGORIES)[number];

export type IntelligenceItem = {
  id: string;
  category: IntelligenceCategory;
  title: string;
  summary: string;
  recommendation: string;
  confidence_score: number;
  impact_score: number;
  generated_at: string;
};

export type IntelligenceSummary = {
  collected_at: string;
  items: IntelligenceItem[];
  counts: Record<IntelligenceCategory, number>;
};

export type MetricTrend = {
  current: number;
  previous: number | null;
};

export type IntelligenceContext = ReportContext & {
  generated_at: string;
  trends: Record<string, MetricTrend>;
};

export type IntelligenceRuleResult = IntelligenceItem | null;

export type IntelligenceSort = "impact" | "confidence";
