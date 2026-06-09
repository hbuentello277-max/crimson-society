import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCorrelationContext } from "@/lib/correlations/engine";
import type { CorrelationContext } from "@/lib/correlations/types";
import { getFounderTimeline } from "@/lib/founder-copilot/timeline";
import { loadIntelligenceContext } from "@/lib/intelligence/engine";
import type { IntelligenceContext } from "@/lib/intelligence/types";
import { createNexusServiceClient } from "@/lib/nexus/client";
import { daysAgoIso } from "@/lib/metrics/query-utils";
import { detectProactiveAlerts } from "@/lib/proactive-intelligence/proactive-alerts";
import { getNexusActionQueue } from "@/lib/action-center/summary";
import { runCached } from "@/lib/nexus/request-cache";

export type CreditsIntelligenceSnapshot = {
  active_rewards: number | null;
  redemptions_this_week: number | null;
  transactions_this_week: number | null;
  redemptions_previous_week: number | null;
  unavailable: string[];
};

export type ActionCenterSnapshot = {
  pending_approval: number;
  recent_types: string[];
  has_recent_launch_announcement: boolean;
  has_recent_blackcard_campaign: boolean;
};

export type CrossSystemContext = {
  generated_at: string;
  intelligence: IntelligenceContext;
  correlations: CorrelationContext;
  proactive: Awaited<ReturnType<typeof detectProactiveAlerts>>;
  founder_timeline: Awaited<ReturnType<typeof getFounderTimeline>>;
  credits: CreditsIntelligenceSnapshot;
  action_center: ActionCenterSnapshot;
  partial: boolean;
  warnings: string[];
};

async function loadCreditsSnapshot(admin: SupabaseClient): Promise<CreditsIntelligenceSnapshot> {
  const weekStart = daysAgoIso(7);
  const previousWeekStart = daysAgoIso(14);
  const unavailable: string[] = [];

  const [rewards, redemptionsWeek, redemptionsPrev, transactionsWeek] = await Promise.all([
    admin
      .from("crimson_credit_rewards")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("crimson_credit_redemptions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart),
    admin
      .from("crimson_credit_redemptions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", previousWeekStart)
      .lt("created_at", weekStart),
    admin
      .from("crimson_credit_transactions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart),
  ]);

  if (rewards.error) unavailable.push("active_rewards");
  if (redemptionsWeek.error) unavailable.push("redemptions_this_week");
  if (redemptionsPrev.error) unavailable.push("redemptions_previous_week");
  if (transactionsWeek.error) unavailable.push("transactions_this_week");

  return {
    active_rewards: rewards.error ? null : (rewards.count ?? 0),
    redemptions_this_week: redemptionsWeek.error ? null : (redemptionsWeek.count ?? 0),
    redemptions_previous_week: redemptionsPrev.error ? null : (redemptionsPrev.count ?? 0),
    transactions_this_week: transactionsWeek.error ? null : (transactionsWeek.count ?? 0),
    unavailable,
  };
}

async function loadActionCenterSnapshot(
  supabase: SupabaseClient,
): Promise<ActionCenterSnapshot> {
  const queue = await getNexusActionQueue(supabase, { access: "owner" });
  const recent = queue.actions.slice(0, 20);
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  const hasRecentLaunch = recent.some(
    (action) =>
      action.action_type === "launch_announcement" &&
      new Date(action.created_at).getTime() >= fourteenDaysAgo,
  );
  const hasRecentBlackcard = recent.some(
    (action) =>
      (action.action_type === "blackcard_promotion" ||
        action.action_type === "blackcard_conversion_campaign") &&
      new Date(action.created_at).getTime() >= fourteenDaysAgo,
  );

  return {
    pending_approval: queue.counts.pending_approval ?? 0,
    recent_types: [...new Set(recent.map((action) => action.action_type))],
    has_recent_launch_announcement: hasRecentLaunch,
    has_recent_blackcard_campaign: hasRecentBlackcard,
  };
}

export async function loadCrossSystemContext(
  supabase: SupabaseClient,
): Promise<CrossSystemContext> {
  return runCached(supabase, "nexus:cross-system-context", () =>
    loadCrossSystemContextImpl(supabase),
  );
}

async function loadCrossSystemContextImpl(
  supabase: SupabaseClient,
): Promise<CrossSystemContext> {
  const admin = createNexusServiceClient();
  const warnings: string[] = [];
  let partial = false;

  const [intelligence, correlations, proactive, founderTimeline, credits, actionCenter] =
    await Promise.all([
      loadIntelligenceContext(supabase),
      loadCorrelationContext(supabase, "7d"),
      detectProactiveAlerts(supabase),
      getFounderTimeline(supabase),
      loadCreditsSnapshot(admin),
      loadActionCenterSnapshot(supabase).catch(() => ({
        pending_approval: 0,
        recent_types: [] as string[],
        has_recent_launch_announcement: false,
        has_recent_blackcard_campaign: false,
      })),
    ]);

  if (proactive.partial) {
    partial = true;
    warnings.push(...(proactive.warnings ?? []));
  }
  if (credits.unavailable.length > 0) {
    partial = true;
    warnings.push(`Credits signals partially unavailable: ${credits.unavailable.join(", ")}`);
  }

  return {
    generated_at: intelligence.generated_at,
    intelligence,
    correlations,
    proactive,
    founder_timeline: founderTimeline,
    credits,
    action_center: actionCenter,
    partial,
    warnings,
  };
}
