import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCrossSystemCorrelations } from "@/lib/cross-system-intelligence/correlations";
import { loadCrossSystemContext } from "@/lib/cross-system-intelligence/context";
import { buildFounderIntelligenceBriefing } from "@/lib/cross-system-intelligence/founder-briefing";
import { buildCrossSystemInsights } from "@/lib/cross-system-intelligence/insights";
import { buildCrossSystemOpportunities } from "@/lib/cross-system-intelligence/opportunity-engine";
import { buildCrossSystemRecommendations } from "@/lib/cross-system-intelligence/recommendations";
import { buildCrossSystemRisks } from "@/lib/cross-system-intelligence/risk-engine";
import { buildCrossSystemTimeline } from "@/lib/cross-system-intelligence/timeline";
import type {
  CrossSystemAccess,
  CrossSystemIntelligenceSummary,
  CrossSystemTimelineWindow,
} from "@/lib/cross-system-intelligence/types";
import { runCached } from "@/lib/nexus/request-cache";

async function buildSummary(
  supabase: SupabaseClient,
  access: CrossSystemAccess,
  window: CrossSystemTimelineWindow = "7d",
): Promise<CrossSystemIntelligenceSummary> {
  const context = await loadCrossSystemContext(supabase);
  const correlations = buildCrossSystemCorrelations(context);
  const timeline = buildCrossSystemTimeline(context, window);
  const risks = buildCrossSystemRisks(context);
  const opportunities = buildCrossSystemOpportunities(context);
  const insights = buildCrossSystemInsights({
    risks,
    opportunities,
    correlations,
    generated_at: context.generated_at,
  });
  const recommendations = buildCrossSystemRecommendations(insights, context.generated_at);
  const founder_briefing = buildFounderIntelligenceBriefing({
    generated_at: context.generated_at,
    risks,
    opportunities,
    correlations,
    recommendations,
    timeline,
  });

  return {
    collected_at: context.generated_at,
    access,
    correlations,
    timeline,
    insights,
    risks,
    opportunities,
    recommendations,
    founder_briefing,
    readOnly: true,
    partial: context.partial || undefined,
    warnings: context.warnings.length > 0 ? context.warnings : undefined,
  };
}

export async function getCrossSystemIntelligenceSummary(
  supabase: SupabaseClient,
  options: { access?: CrossSystemAccess; window?: CrossSystemTimelineWindow } = {},
): Promise<CrossSystemIntelligenceSummary> {
  return runCached(
    supabase,
    `nexus:cross-system-intelligence:${options.window ?? "7d"}`,
    () => buildSummary(supabase, options.access ?? "owner", options.window ?? "7d"),
  );
}

export async function getCrossSystemCorrelations(supabase: SupabaseClient) {
  const context = await loadCrossSystemContext(supabase);
  return {
    collected_at: context.generated_at,
    correlations: buildCrossSystemCorrelations(context),
    readOnly: true as const,
    partial: context.partial || undefined,
    warnings: context.warnings.length > 0 ? context.warnings : undefined,
  };
}

export async function getCrossSystemTimeline(
  supabase: SupabaseClient,
  window: CrossSystemTimelineWindow = "7d",
) {
  const context = await loadCrossSystemContext(supabase);
  return {
    collected_at: context.generated_at,
    window,
    events: buildCrossSystemTimeline(context, window),
    readOnly: true as const,
  };
}

export async function getCrossSystemInsightsPayload(supabase: SupabaseClient) {
  const summary = await getCrossSystemIntelligenceSummary(supabase);
  return {
    collected_at: summary.collected_at,
    insights: summary.insights,
    readOnly: true as const,
    partial: summary.partial,
    warnings: summary.warnings,
  };
}

export async function getCrossSystemRisksPayload(supabase: SupabaseClient) {
  const context = await loadCrossSystemContext(supabase);
  return {
    collected_at: context.generated_at,
    risks: buildCrossSystemRisks(context),
    readOnly: true as const,
    partial: context.partial || undefined,
    warnings: context.warnings.length > 0 ? context.warnings : undefined,
  };
}

export async function getCrossSystemOpportunitiesPayload(supabase: SupabaseClient) {
  const context = await loadCrossSystemContext(supabase);
  return {
    collected_at: context.generated_at,
    opportunities: buildCrossSystemOpportunities(context),
    readOnly: true as const,
    partial: context.partial || undefined,
    warnings: context.warnings.length > 0 ? context.warnings : undefined,
  };
}

export async function getFounderIntelligenceBriefingPayload(supabase: SupabaseClient) {
  const summary = await getCrossSystemIntelligenceSummary(supabase);
  return summary.founder_briefing;
}
