export type ReportInsightRef = {
  id: string;
  title: string;
  severity: string;
  category: string;
  priority_score: number | null;
};

export type ReportWorkflowRef = {
  slug: string;
  display_name: string;
  workflow_status: string;
  workflow_score: number | null;
  success_rate_1h: number | null;
};

export type ExecutiveSnapshot = {
  total_users: number | null;
  new_users_this_week: number | null;
  new_users_this_month: number | null;
  blackcard_members: number | null;
  estimated_mrr: number | null;
  estimated_arr: number | null;
  posts_this_week: number | null;
  meets_created_this_week: number | null;
  messages_this_week: number | null;
  active_observations: number | null;
  open_alerts: number | null;
  open_incidents: number | null;
};

export type CommunityGrowthReport = {
  total_users: number | null;
  new_users_this_week: number | null;
  new_users_this_month: number | null;
  active_members_estimate: number | null;
  top_growth_signals: string[];
};

export type RevenueIntelligenceReport = {
  active_subscriptions: number | null;
  blackcard_members: number | null;
  estimated_mrr: number | null;
  estimated_arr: number | null;
  recent_subscription_changes_24h: number | null;
  revenue_observations: ReportInsightRef[];
};

export type EngagementIntelligenceReport = {
  posts_this_week: number | null;
  posts_this_month: number | null;
  meets_this_week: number | null;
  meets_this_month: number | null;
  messages_this_week: number | null;
  messages_this_month: number | null;
  activity_trends: string[];
  top_workflows: ReportWorkflowRef[];
};

export type OperationalRiskSummary = {
  infrastructure_status: string | null;
  workflow_status: string | null;
  active_alerts_count: number | null;
  open_incidents_count: number | null;
  active_insights_count: number | null;
  highest_priority_insights: ReportInsightRef[];
  command_recommendations_count: number | null;
};

export type ExecutiveReportSummary = {
  collected_at: string;
  snapshot: ExecutiveSnapshot;
  community_growth: CommunityGrowthReport;
  revenue_intelligence: RevenueIntelligenceReport;
  engagement_intelligence: EngagementIntelligenceReport;
  operational_risk: OperationalRiskSummary;
  unavailable_metrics: string[];
};

export type PeriodReportSummaryBlock = {
  headline: string;
  bullets: string[];
};

export type WeeklyExecutiveReport = {
  report_type: "weekly";
  period_start: string;
  period_end: string;
  generated_at: string;
  growth_summary: PeriodReportSummaryBlock;
  revenue_summary: PeriodReportSummaryBlock;
  engagement_summary: PeriodReportSummaryBlock;
  operational_summary: PeriodReportSummaryBlock;
  risks: string[];
  recommended_owner_focus: string[];
  unavailable_metrics: string[];
};

export type MonthlyExecutiveReport = {
  report_type: "monthly";
  period_start: string;
  period_end: string;
  generated_at: string;
  total_growth: PeriodReportSummaryBlock;
  revenue_summary: PeriodReportSummaryBlock;
  engagement_summary: PeriodReportSummaryBlock;
  operational_summary: PeriodReportSummaryBlock;
  risks: string[];
  recommended_owner_focus: string[];
  unavailable_metrics: string[];
};
