export type BriefingSection = {
  title: string;
  lines: string[];
};

export type WeeklyOwnerBriefing = {
  briefing_type: "weekly";
  period_start: string;
  period_end: string;
  headline: string;
  community_summary: BriefingSection;
  revenue_summary: BriefingSection;
  engagement_summary: BriefingSection;
  operations_summary: BriefingSection;
  risks: string[];
  recommended_focus: string[];
  generated_at: string;
};

export type MonthlyOwnerBriefing = {
  briefing_type: "monthly";
  period_start: string;
  period_end: string;
  headline: string;
  growth_summary: BriefingSection;
  revenue_summary: BriefingSection;
  engagement_summary: BriefingSection;
  operations_summary: BriefingSection;
  risks: string[];
  recommended_focus: string[];
  generated_at: string;
};

export type OwnerBriefing = WeeklyOwnerBriefing | MonthlyOwnerBriefing;
