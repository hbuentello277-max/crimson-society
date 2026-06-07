export const ANALYSIS_SOURCES = [
  "Founder Dashboard",
  "Reports",
  "Briefings",
  "Intelligence",
  "Memory",
  "Correlations",
  "Planning",
  "Forecasting",
  "Copilot",
  "Operational Intelligence",
  "Platform Control",
  "Decision Engine",
  "Scenarios",
  "Alerts",
  "Incidents",
  "Commands",
] as const;

export type AnalysisSource = (typeof ANALYSIS_SOURCES)[number];

export type AnalysisRequest = {
  question: string;
};

export type AnalysisResponse = {
  analysis: string;
  confidence: number;
  sources: AnalysisSource[];
  related_routes: string[];
};

export type AnalysisApiResponse = AnalysisResponse & {
  ok: true;
};

export type GroundingPacket = {
  generated_at: string;
  consulted_sources: AnalysisSource[];
  founder_dashboard: Record<string, unknown> | null;
  reports: Record<string, unknown> | null;
  briefings: Record<string, unknown> | null;
  intelligence: Record<string, unknown> | null;
  memory: Record<string, unknown> | null;
  correlations: Record<string, unknown> | null;
  planning: Record<string, unknown> | null;
  forecasting: Record<string, unknown> | null;
  copilot: Record<string, unknown> | null;
  operational_intelligence: Record<string, unknown> | null;
  mission_control: Record<string, unknown> | null;
  decision_engine: Record<string, unknown> | null;
  scenarios: Record<string, unknown> | null;
  alerts: Record<string, unknown> | null;
  incidents: Record<string, unknown> | null;
  commands: Record<string, unknown> | null;
};

export type StructuredAnalysisOutput = AnalysisResponse;
