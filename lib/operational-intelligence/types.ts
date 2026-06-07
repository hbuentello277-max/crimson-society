export const OPERATIONAL_INTELLIGENCE_CATEGORIES = [
  "growth",
  "revenue",
  "engagement",
  "community",
  "operations",
  "risk",
  "platform_health",
] as const;

export type OperationalIntelligenceCategory =
  (typeof OPERATIONAL_INTELLIGENCE_CATEGORIES)[number];

export type RelationshipStrength = "high" | "medium" | "low";

export type OperationalIntelligenceItem = {
  id: string;
  category: OperationalIntelligenceCategory;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  influence_score: number;
  confidence_score: number;
  impact_score: number;
  recommendation: string;
  related_routes: string[];
};

export type RelationshipLink = {
  id: string;
  source_label: string;
  target_label: string;
  source_direction: "up" | "down" | "flat" | "unknown";
  target_direction: "up" | "down" | "flat" | "unknown";
  strength: RelationshipStrength;
  summary: string;
  category: OperationalIntelligenceCategory;
};

export type RepeatingPattern = {
  id: string;
  title: string;
  summary: string;
  evidence: string[];
  confidence_score: number;
  category: OperationalIntelligenceCategory;
  related_routes: string[];
};

export type InfluenceRankingItem = {
  id: string;
  domain: "growth" | "revenue" | "engagement" | "community_health" | "operational_stability";
  signal: string;
  influence_score: number;
  confidence_score: number;
  direction: "positive" | "negative" | "mixed";
  summary: string;
};

export type OperationalDriver = {
  id: string;
  label: string;
  summary: string;
  influence_score: number;
  category: OperationalIntelligenceCategory;
  related_routes: string[];
};

export type OperationalDragItem = {
  id: string;
  label: string;
  summary: string;
  severity_score: number;
  category: OperationalIntelligenceCategory;
  related_routes: string[];
};

export type OperationalIntelligenceOverview = {
  headline: string;
  relationship_count: number;
  pattern_count: number;
  driver_count: number;
  drag_count: number;
  top_driver: string | null;
  top_drag: string | null;
};

export type OperationalIntelligenceSummary = {
  generated_at: string;
  overview: OperationalIntelligenceOverview;
  relationships: RelationshipLink[];
  patterns: RepeatingPattern[];
  influence_rankings: InfluenceRankingItem[];
  drivers: OperationalDriver[];
  drag: OperationalDragItem[];
  recommendations: OperationalIntelligenceItem[];
  counts_by_category: Record<OperationalIntelligenceCategory, number>;
};

export type MetricDirection = "up" | "down" | "flat" | "unknown";

export type TrendSnapshot = {
  label: string;
  key: string;
  current: number | null;
  direction: MetricDirection;
};
