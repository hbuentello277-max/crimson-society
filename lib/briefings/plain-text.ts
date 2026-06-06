import type {
  BriefingSection,
  MonthlyOwnerBriefing,
  WeeklyOwnerBriefing,
} from "@/lib/briefings/types";

function formatSection(section: BriefingSection): string {
  return [section.title + ":", ...section.lines.map((line) => line)].join("\n");
}

export function formatWeeklyBriefingPlainText(briefing: WeeklyOwnerBriefing): string {
  const parts = [
    "Weekly Owner Briefing",
    "",
    "Headline:",
    briefing.headline,
    "",
    formatSection(briefing.community_summary),
    "",
    formatSection(briefing.revenue_summary),
    "",
    formatSection(briefing.engagement_summary),
    "",
    formatSection(briefing.operations_summary),
    "",
    "Risks:",
    ...briefing.risks.map((risk) => risk),
    "",
    "Recommended Focus:",
    ...briefing.recommended_focus.map((item) => `* ${item}`),
  ];

  return parts.join("\n");
}

export function formatMonthlyBriefingPlainText(briefing: MonthlyOwnerBriefing): string {
  const parts = [
    "Monthly Owner Briefing",
    "",
    "Headline:",
    briefing.headline,
    "",
    formatSection(briefing.growth_summary),
    "",
    formatSection(briefing.revenue_summary),
    "",
    formatSection(briefing.engagement_summary),
    "",
    formatSection(briefing.operations_summary),
    "",
    "Risks:",
    ...briefing.risks.map((risk) => risk),
    "",
    "Recommended Focus:",
    ...briefing.recommended_focus.map((item) => `* ${item}`),
  ];

  return parts.join("\n");
}
