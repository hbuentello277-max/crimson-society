import type { ReportContext } from "@/lib/reports/context";
import type {
  BriefingSection,
  MonthlyOwnerBriefing,
  WeeklyOwnerBriefing,
} from "@/lib/briefings/types";

function countSentence(
  value: number | null,
  singular: (n: number) => string,
  unavailable: string,
): string {
  if (value == null) return unavailable;
  return singular(value);
}

function currencySentence(value: number | null, label: string): string {
  if (value == null) return `${label} is unavailable.`;
  return `${label} is $${value.toLocaleString()}.`;
}

function degradedWorkflows(context: ReportContext) {
  return (context.mission.workflows ?? []).filter((workflow) =>
    ["degraded", "impaired", "critical", "failing", "warn", "warning"].includes(
      workflow.workflow_status.toLowerCase(),
    ),
  );
}

function infraLabel(status: string) {
  if (status === "operational") return "operational";
  return status;
}

export function buildWeeklyHeadline(context: ReportContext): string {
  const newUsers = context.metrics.growth.new_users_this_week;
  const opsStable =
    context.health.systemStatus === "operational" &&
    !["degraded", "impaired", "critical", "failing"].includes(context.mission.status.toLowerCase()) &&
    context.alerts.counts.critical === 0 &&
    context.incidents.open.length === 0;

  if (newUsers != null && newUsers > 0 && opsStable) {
    return "Crimson Society grew steadily this week while operations remained stable.";
  }

  if (newUsers != null && newUsers > 0) {
    return "Crimson Society added new members this week. Review operations for items that need attention.";
  }

  if (!opsStable) {
    return "Operations need attention this week. Monitor workflows, alerts, and incidents closely.";
  }

  return "Community activity was quiet this week while operations were monitored.";
}

export function buildMonthlyHeadline(context: ReportContext): string {
  const newUsers = context.metrics.growth.new_users_this_month;
  const revenue = context.metrics.revenue.estimated_mrr;
  const opsStable =
    context.health.systemStatus === "operational" &&
    !["degraded", "impaired", "critical", "failing"].includes(context.mission.status.toLowerCase());

  if (newUsers != null && newUsers > 0 && opsStable) {
    return "Crimson Society continued building community momentum over the last 30 days.";
  }

  if (revenue != null && revenue > 0 && (newUsers == null || newUsers === 0)) {
    return "Revenue held steady this month while community growth remained limited.";
  }

  if (!opsStable) {
    return "The last 30 days included operational friction that deserves owner review.";
  }

  return "Monthly performance was steady with limited major changes detected.";
}

export function buildWeeklyCommunitySummary(context: ReportContext): BriefingSection {
  const { growth } = context.metrics;
  const lines = [
    countSentence(
      growth.new_users_this_week,
      (n) => `${n.toLocaleString()} new user${n === 1 ? "" : "s"} joined this week.`,
      "New users this week is unavailable.",
    ),
    countSentence(
      growth.total_users,
      (n) => `${n.toLocaleString()} total users are currently tracked.`,
      "Total users is unavailable.",
    ),
    countSentence(
      growth.active_profiles,
      (n) => `${n.toLocaleString()} active profile${n === 1 ? "" : "s"} are currently tracked.`,
      "Active profile estimate is unavailable.",
    ),
  ];

  const growthObservations = context.observations.active.filter(
    (row) => row.category === "growth" || row.title.toLowerCase().includes("growth"),
  );
  for (const observation of growthObservations.slice(0, 2)) {
    lines.push(observation.title);
  }

  return { title: "Community", lines };
}

export function buildMonthlyGrowthSummary(context: ReportContext): BriefingSection {
  const { growth, blackcard } = context.metrics;
  const lines = [
    countSentence(
      growth.new_users_this_month,
      (n) => `${n.toLocaleString()} new user${n === 1 ? "" : "s"} joined in the last 30 days.`,
      "New users this month is unavailable.",
    ),
    countSentence(
      growth.total_users,
      (n) => `${n.toLocaleString()} total users are currently tracked.`,
      "Total users is unavailable.",
    ),
    countSentence(
      growth.active_profiles,
      (n) => `${n.toLocaleString()} active profile${n === 1 ? "" : "s"} are currently tracked.`,
      "Active profile estimate is unavailable.",
    ),
  ];

  if (blackcard.conversion_estimate_available && blackcard.conversion_estimate != null) {
    lines.push(
      `Blackcard conversion estimate is ${Math.round(blackcard.conversion_estimate * 100)}% this month.`,
    );
  }

  return { title: "Growth", lines };
}

export function buildRevenueSummary(context: ReportContext): BriefingSection {
  const { revenue, blackcard } = context.metrics;
  const lines = [
    currencySentence(revenue.estimated_mrr, "Estimated MRR"),
    currencySentence(revenue.estimated_arr, "Estimated ARR"),
    countSentence(
      blackcard.active_members,
      (n) => `Blackcard members: ${n.toLocaleString()}.`,
      "Blackcard member count is unavailable.",
    ),
    countSentence(
      revenue.active_subscriptions,
      (n) => `${n.toLocaleString()} active subscription${n === 1 ? "" : "s"} are tracked.`,
      "Active subscription count is unavailable.",
    ),
  ];

  if (revenue.recent_subscription_changes_24h != null) {
    lines.push(
      `${revenue.recent_subscription_changes_24h.toLocaleString()} subscription change${revenue.recent_subscription_changes_24h === 1 ? "" : "s"} occurred in the last 24 hours.`,
    );
  }

  const revenueInsights = context.observations.active.filter(
    (row) =>
      row.category === "revenue" ||
      row.category === "commerce" ||
      row.title.toLowerCase().includes("revenue"),
  );
  for (const observation of revenueInsights.slice(0, 2)) {
    lines.push(observation.title);
  }

  return { title: "Revenue", lines };
}

export function buildWeeklyEngagementSummary(context: ReportContext): BriefingSection {
  const { activity } = context.metrics;
  return {
    title: "Engagement",
    lines: [
      countSentence(
        activity.meets_this_week,
        (n) => `${n.toLocaleString()} meet${n === 1 ? "" : "s"} ${n === 1 ? "was" : "were"} created this week.`,
        "Meets created this week is unavailable.",
      ),
      countSentence(
        activity.messages_this_week,
        (n) => `${n.toLocaleString()} message${n === 1 ? "" : "s"} ${n === 1 ? "was" : "were"} sent this week.`,
        "Messages sent this week is unavailable.",
      ),
      countSentence(
        activity.posts_this_week,
        (n) => `Posts this week: ${n.toLocaleString()}.`,
        "Posts this week is unavailable.",
      ),
    ],
  };
}

export function buildMonthlyEngagementSummary(context: ReportContext): BriefingSection {
  const { activity } = context.metrics;
  const { monthly_activity } = context;

  return {
    title: "Engagement",
    lines: [
      countSentence(
        monthly_activity.posts,
        (n) => `${n.toLocaleString()} post${n === 1 ? "" : "s"} in the last 30 days.`,
        "Posts this month is unavailable.",
      ),
      countSentence(
        monthly_activity.meets,
        (n) => `${n.toLocaleString()} meet${n === 1 ? "" : "s"} created in the last 30 days.`,
        "Meets this month is unavailable.",
      ),
      countSentence(
        monthly_activity.messages,
        (n) => `${n.toLocaleString()} message${n === 1 ? "" : "s"} sent in the last 30 days.`,
        "Messages this month is unavailable.",
      ),
      countSentence(
        activity.posts_this_week,
        (n) => `Posts this week (snapshot): ${n.toLocaleString()}.`,
        "Posts this week snapshot is unavailable.",
      ),
      countSentence(
        activity.messages_this_week,
        (n) => `Messages this week (snapshot): ${n.toLocaleString()}.`,
        "Messages this week snapshot is unavailable.",
      ),
    ],
  };
}

export function buildOperationsSummary(context: ReportContext): BriefingSection {
  const degraded = degradedWorkflows(context);
  const lines = [
    `Infrastructure is ${infraLabel(context.health.systemStatus)}.`,
    `Platform status is ${context.mission.status}.`,
  ];

  if (degraded.length > 0) {
    const names = degraded.map((workflow) => workflow.display_name).join(", ");
    lines.push(`Platform workflows needing attention include ${names}.`);
  }

  if (context.alerts.counts.active > 0) {
    lines.push(`${context.alerts.counts.active} active alert${context.alerts.counts.active === 1 ? "" : "s"} are open.`);
  }

  if (context.incidents.open.length > 0) {
    lines.push(`${context.incidents.open.length} open incident${context.incidents.open.length === 1 ? "" : "s"} require attention.`);
  }

  if (context.observations.counts.active > 0) {
    lines.push(`${context.observations.counts.active} active insight${context.observations.counts.active === 1 ? "" : "s"} are being tracked.`);
  }

  return { title: "Operations", lines };
}

export function buildBriefingRisks(context: ReportContext): string[] {
  const risks: string[] = [];

  const degraded = degradedWorkflows(context);
  if (degraded.length > 0) {
    risks.push("Platform workflows need attention in one or more areas.");
  }

  if (context.health.systemStatus !== "operational") {
    risks.push(`Infrastructure is ${context.health.systemStatus}.`);
  }

  if (context.alerts.counts.critical > 0) {
    risks.push(`${context.alerts.counts.critical} critical alert${context.alerts.counts.critical === 1 ? "" : "s"} need attention.`);
  }

  if (context.incidents.open.length > 0) {
    risks.push(`${context.incidents.open.length} open incident${context.incidents.open.length === 1 ? "" : "s"} are active.`);
  }

  for (const observation of context.observations.active) {
    if (
      observation.severity === "critical" ||
      observation.category === "revenue" ||
      observation.title.toLowerCase().includes("revenue") ||
      observation.title.toLowerCase().includes("below target")
    ) {
      risks.push(observation.title);
    }
  }

  if (context.metrics.revenue.estimated_mrr != null && context.metrics.revenue.estimated_mrr <= 0) {
    risks.push("Revenue is still below target.");
  }

  if (risks.length === 0) {
    risks.push("No major risks detected in current Nexus signals.");
  }

  return risks.slice(0, 8);
}

export function buildBriefingFocus(context: ReportContext): string[] {
  const focus: string[] = [];
  const { metrics } = context;
  const degraded = degradedWorkflows(context);
  const degradedSlugs = new Set(degraded.map((workflow) => workflow.slug));

  if ((metrics.blackcard.active_members ?? 0) < 5) {
    focus.push("Promote Blackcard benefits.");
  }

  if ((metrics.activity.posts_this_week ?? 0) === 0) {
    focus.push("Encourage riders to create posts.");
  }

  if (degradedSlugs.has("meet_creation") || degradedSlugs.has("meet_joining")) {
    focus.push("Test meet creation and meet joining flows.");
  }

  if (degradedSlugs.has("messaging")) {
    focus.push("Test messaging delivery and inbox flows.");
  }

  if (degradedSlugs.has("post_creation")) {
    focus.push("Review post creation workflow checks.");
  }

  if (degradedSlugs.has("user_login") || degradedSlugs.has("user_signup")) {
    focus.push("Verify login and signup reliability.");
  }

  if ((metrics.growth.new_users_this_week ?? 0) > 0 || (metrics.growth.new_users_this_month ?? 0) > 0) {
    focus.push("Continue beta onboarding for new riders.");
  }

  if (context.alerts.counts.critical > 0) {
    focus.push("Review critical alerts in Nexus Alerts.");
  }

  if (context.incidents.open.length > 0) {
    focus.push("Triage open incidents and confirm war room coverage.");
  }

  if (context.commands.counts.suggested > 0) {
    focus.push("Review suggested command recommendations in Nexus Commands.");
  }

  if (focus.length === 0) {
    focus.push("Maintain weekly operational review in Nexus Reports.");
  }

  return focus.slice(0, 6);
}

export function composeWeeklyBriefing(context: ReportContext): WeeklyOwnerBriefing {
  const generatedAt = new Date().toISOString();

  return {
    briefing_type: "weekly",
    period_start: new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString(),
    period_end: generatedAt,
    generated_at: generatedAt,
    headline: buildWeeklyHeadline(context),
    community_summary: buildWeeklyCommunitySummary(context),
    revenue_summary: buildRevenueSummary(context),
    engagement_summary: buildWeeklyEngagementSummary(context),
    operations_summary: buildOperationsSummary(context),
    risks: buildBriefingRisks(context),
    recommended_focus: buildBriefingFocus(context),
  };
}

export function composeMonthlyBriefing(context: ReportContext): MonthlyOwnerBriefing {
  const generatedAt = new Date().toISOString();

  return {
    briefing_type: "monthly",
    period_start: new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString(),
    period_end: generatedAt,
    generated_at: generatedAt,
    headline: buildMonthlyHeadline(context),
    growth_summary: buildMonthlyGrowthSummary(context),
    revenue_summary: buildRevenueSummary(context),
    engagement_summary: buildMonthlyEngagementSummary(context),
    operations_summary: buildOperationsSummary(context),
    risks: buildBriefingRisks(context),
    recommended_focus: buildBriefingFocus(context),
  };
}
