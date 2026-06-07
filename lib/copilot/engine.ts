import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDailyFocus, buildRecommendedNextSteps } from "@/lib/copilot/focus";
import { buildImprovingSignals, buildTopOpportunity } from "@/lib/copilot/opportunities";
import { buildDecliningSignals, buildTopRisk } from "@/lib/copilot/risk";
import type { CopilotSummary, FounderGuidanceBrief } from "@/lib/copilot/types";
import { getNexusCorrelations } from "@/lib/correlations/summary";
import { getNexusForecasting } from "@/lib/forecasting/engine";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { getMonthlyOwnerBriefing } from "@/lib/briefings/monthly";
import { getWeeklyOwnerBriefing } from "@/lib/briefings/weekly";
import { getNexusPlanning } from "@/lib/planning/engine";
import { getExecutiveReportSummary } from "@/lib/reports/summary";
import { loadReportContext } from "@/lib/reports/context";
import {
  deriveFounderBrief,
  derivePlatformStatus,
} from "@/lib/nexus/founder-derive";

function buildFounderGuidance(input: {
  planning: Awaited<ReturnType<typeof getNexusPlanning>>;
  report: Awaited<ReturnType<typeof loadReportContext>>;
  top_opportunity: CopilotSummary["top_opportunity"];
  top_risk: CopilotSummary["top_risk"];
  daily_focus: CopilotSummary["daily_focus"];
  weekly_headline: string;
}): FounderGuidanceBrief {
  const degradedWorkflows = (input.report.mission.workflows ?? []).filter((workflow) =>
    ["degraded", "impaired", "critical", "failing", "warn", "warning"].includes(
      workflow.workflow_status.toLowerCase(),
    ),
  ).length;

  const platformStatus = derivePlatformStatus({
    systemStatus: input.report.health.systemStatus,
    missionStatus: input.report.mission.status,
    criticalAlerts: input.report.alerts.counts.critical ?? 0,
    openIncidents: input.report.incidents.open.length,
    degradedWorkflows,
  });

  const founderBrief = deriveFounderBrief({
    platformStatus,
    criticalAlerts: input.report.alerts.counts.critical ?? 0,
    openIncidents: input.report.incidents.open.length,
    pendingCommands:
      (input.report.commands.counts.pending_approval ?? 0) +
      (input.report.commands.counts.suggested ?? 0),
    newUsersWeek: input.report.metrics.growth.new_users_this_week,
    degradedWorkflows,
  });

  let overall_status = founderBrief.overall_state;
  if (input.top_risk?.severity === "critical") {
    overall_status = "Crimson Society requires immediate owner attention on active risk signals.";
  } else if (input.top_opportunity && !input.top_risk) {
    overall_status = "Platform is stable with a supported growth opportunity ready for review.";
  }

  const primary_focus =
    input.daily_focus[0]?.title ??
    input.planning.brief.primary_focus ??
    founderBrief.top_focus;

  const secondary_focus =
    input.daily_focus[1]?.title ??
    input.planning.brief.secondary_focus ??
    "Review correlations and memory for emerging shifts.";

  return {
    overall_status,
    primary_focus,
    secondary_focus,
    largest_opportunity:
      input.top_opportunity?.title ??
      input.planning.brief.biggest_opportunity ??
      "No supported opportunity detected from current Nexus data.",
    largest_risk:
      input.top_risk?.title ??
      input.planning.brief.biggest_risk ??
      "No major active risk pattern detected from current Nexus data.",
    recommended_next_step:
      input.daily_focus[0]
        ? `Open ${input.daily_focus[0].related_route.replace("/admin/nexus/", "")} and address: ${input.daily_focus[0].title}`
        : founderBrief.recommended_next_step,
  };
}

export async function getNexusCopilot(supabase: SupabaseClient): Promise<CopilotSummary> {
  const generated_at = new Date().toISOString();

  const [
    report,
    weeklyBriefing,
    monthlyBriefing,
    executiveReport,
    intelligence,
    memory,
    correlations,
    planning,
    forecasting,
  ] = await Promise.all([
    loadReportContext(supabase),
    getWeeklyOwnerBriefing(supabase),
    getMonthlyOwnerBriefing(supabase),
    getExecutiveReportSummary(supabase),
    getNexusIntelligence(supabase, { sort: "impact" }),
    getNexusMemorySummary(supabase, { limit: 40 }),
    getNexusCorrelations(supabase, { window: "7d", sort: "impact" }),
    getNexusPlanning(supabase),
    getNexusForecasting(supabase),
  ]);

  void monthlyBriefing;
  void executiveReport;

  const daily_focus = buildDailyFocus(planning, report);
  const top_opportunity = buildTopOpportunity({ planning, intelligence, correlations });
  const top_risk = buildTopRisk({ planning, report, forecasting, correlations });
  const improving_signals = buildImprovingSignals({ planning, forecasting });
  const declining_signals = buildDecliningSignals({ planning, forecasting, report });

  if (memory.entries.length >= 3 && improving_signals.length < 6) {
    improving_signals.push({
      id: "memory:history",
      label: "Operational memory accumulating",
      summary: `${memory.entries.length} memory entries support longer-range founder guidance.`,
      source: "Memory",
    });
  }

  const guidance = buildFounderGuidance({
    planning,
    report,
    top_opportunity,
    top_risk,
    daily_focus,
    weekly_headline: weeklyBriefing.headline,
  });

  const recommended_next_steps = buildRecommendedNextSteps({
    daily_focus,
    top_risk,
    top_opportunity,
    planning,
  });

  return {
    generated_at,
    guidance,
    daily_focus,
    top_opportunity,
    top_risk,
    improving_signals,
    declining_signals,
    recommended_next_steps,
  };
}
