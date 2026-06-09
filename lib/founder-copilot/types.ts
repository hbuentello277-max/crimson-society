export type FounderPlatformHealth = {
  status: string;
  missionScore: number | null;
  missionStatus: string;
  criticalAlerts: number;
  openIncidents: number;
  degradedWorkflows: number;
};

export type FounderMembershipGrowth = {
  totalUsers: number | null;
  newUsersToday: number | null;
  newUsersThisWeek: number | null;
  newUsersThisMonth: number | null;
};

export type FounderBlackcardGrowth = {
  activeMembers: number | null;
  conversionEstimate: number | null;
  monthlyPlanCount: number | null;
  yearlyPlanCount: number | null;
};

export type FounderRevenueSummary = {
  estimatedMrr: number | null;
  estimatedArr: number | null;
  revenueToday: string | null;
  paidOrdersToday: number | null;
};

export type FounderAlertSummary = {
  active: number;
  critical: number;
  topAlerts: Array<{ title: string; severity: string }>;
};

export type FounderPlatformJobSummary = {
  overallStatus: string;
  failedCount: number;
  overdueCount: number;
  failedJobs: Array<{ label: string; status: string; error?: string | null }>;
};

export type FounderBriefing = {
  generatedAt: string;
  platformHealth: FounderPlatformHealth;
  membershipGrowth: FounderMembershipGrowth;
  blackcardGrowth: FounderBlackcardGrowth;
  revenueSummary: FounderRevenueSummary;
  openAlerts: FounderAlertSummary;
  failedPlatformJobs: FounderPlatformJobSummary;
  pendingReports: number;
  recommendedActions: string[];
  partial?: boolean;
  warnings?: string[];
};

export type FounderRecommendation = {
  id: string;
  priority: number;
  title: string;
  reason: string;
  category: "platform" | "jobs" | "metrics" | "reports" | "launch" | "risk" | "growth";
  relatedRoute: string;
};

export type FounderRecommendations = {
  generatedAt: string;
  recommendations: FounderRecommendation[];
  topRisk: string | null;
  launchBlockers: string[];
  partial?: boolean;
  warnings?: string[];
};

export type FounderTimelineEntry = {
  id: string;
  entryType: string;
  title: string;
  summary: string;
  occurredAt: string;
  source: string;
};

export type FounderTimeline = {
  generatedAt: string;
  recentAccomplishments: FounderTimelineEntry[];
  recentDecisions: FounderTimelineEntry[];
  currentBlockers: FounderTimelineEntry[];
  nextActions: string[];
  partial?: boolean;
  warnings?: string[];
};

export type FounderQuestionType =
  | "focus_today"
  | "launch_blockers"
  | "launch_readiness"
  | "changed_today"
  | "biggest_risk"
  | "platform_health"
  | "phase_status"
  | "completed_this_week"
  | "memory_summary"
  | "next_steps"
  | "general";
