import type { SupabaseClient } from "@supabase/supabase-js";
import { getMonthlyOwnerBriefing } from "@/lib/briefings/monthly";
import { getWeeklyOwnerBriefing } from "@/lib/briefings/weekly";
import { getNexusCopilot } from "@/lib/copilot/engine";
import { getNexusCorrelations } from "@/lib/correlations/summary";
import { getNexusDecisionEngine } from "@/lib/decision-engine/engine";
import { getNexusForecasting } from "@/lib/forecasting/engine";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { getNexusMissionControl } from "@/lib/mission-control/engine";
import { getNexusOperationalIntelligence } from "@/lib/operational-intelligence/engine";
import { getNexusPlanning } from "@/lib/planning/engine";
import { loadReportContext } from "@/lib/reports/context";
import { getExecutiveReportSummary } from "@/lib/reports/summary";
import { getNexusScenarios } from "@/lib/scenarios/engine";
import { runCached } from "@/lib/nexus/request-cache";

export type ChatContext = {
  loaded_at: string;
  report: Awaited<ReturnType<typeof loadReportContext>>;
  executive: Awaited<ReturnType<typeof getExecutiveReportSummary>>;
  weekly_briefing: Awaited<ReturnType<typeof getWeeklyOwnerBriefing>>;
  monthly_briefing: Awaited<ReturnType<typeof getMonthlyOwnerBriefing>>;
  copilot: Awaited<ReturnType<typeof getNexusCopilot>>;
  planning: Awaited<ReturnType<typeof getNexusPlanning>>;
  forecasting: Awaited<ReturnType<typeof getNexusForecasting>>;
  intelligence: Awaited<ReturnType<typeof getNexusIntelligence>>;
  memory: Awaited<ReturnType<typeof getNexusMemorySummary>>;
  correlations: Awaited<ReturnType<typeof getNexusCorrelations>>;
  operational: Awaited<ReturnType<typeof getNexusOperationalIntelligence>>;
  mission: Awaited<ReturnType<typeof getNexusMissionControl>>;
  decisions: Awaited<ReturnType<typeof getNexusDecisionEngine>>;
  scenarios: Awaited<ReturnType<typeof getNexusScenarios>>;
};

export function loadChatContext(supabase: SupabaseClient): Promise<ChatContext> {
  return runCached(supabase, "nexus:chat-context", () => loadChatContextImpl(supabase));
}

async function loadChatContextImpl(supabase: SupabaseClient): Promise<ChatContext> {
  const [
    report,
    executive,
    weekly_briefing,
    monthly_briefing,
    copilot,
    planning,
    forecasting,
    intelligence,
    memory,
    correlations,
    operational,
    mission,
    decisions,
    scenarios,
  ] = await Promise.all([
    loadReportContext(supabase),
    getExecutiveReportSummary(supabase),
    getWeeklyOwnerBriefing(supabase),
    getMonthlyOwnerBriefing(supabase),
    getNexusCopilot(supabase),
    getNexusPlanning(supabase),
    getNexusForecasting(supabase),
    getNexusIntelligence(supabase, { sort: "impact" }),
    getNexusMemorySummary(supabase, { limit: 40 }),
    getNexusCorrelations(supabase, { window: "30d", sort: "impact" }),
    getNexusOperationalIntelligence(supabase),
    getNexusMissionControl(supabase),
    getNexusDecisionEngine(supabase),
    getNexusScenarios(supabase),
  ]);

  return {
    loaded_at: new Date().toISOString(),
    report,
    executive,
    weekly_briefing,
    monthly_briefing,
    copilot,
    planning,
    forecasting,
    intelligence,
    memory,
    correlations,
    operational,
    mission,
    decisions,
    scenarios,
  };
}
