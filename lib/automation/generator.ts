import type { SupabaseClient } from "@supabase/supabase-js";
import { getMonthlyOwnerBriefing } from "@/lib/briefings/monthly";
import { getWeeklyOwnerBriefing } from "@/lib/briefings/weekly";
import { getNexusCorrelations } from "@/lib/correlations/summary";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import { createNexusServiceClient } from "@/lib/nexus/client";
import { getNexusPlanning } from "@/lib/planning/engine";
import { getExecutiveReportSummary } from "@/lib/reports/summary";
import { getNexusCommandsSummary } from "@/lib/commands/summary";
import type { AutomationDraft, AutomationGenerationResult } from "@/lib/automation/types";
import type { NexusAutomationActionType } from "@/lib/nexus/constants";

const MIN_IMPACT_SCORE = 70;

function mapCategoryToActionType(
  category: string,
  source: string,
): NexusAutomationActionType {
  if (source === "briefings" || source === "reports") {
    return "reporting";
  }

  if (category === "engagement") return "engagement";
  if (category === "growth" || category === "community" || category === "blackcard") {
    return "growth";
  }
  if (category === "revenue") return "growth";
  if (category === "risk" || category === "platform_health") return "monitoring";
  if (category === "operations") return "operations";
  if (category === "opportunity") return "growth";

  return "operations";
}

function reviewTitle(label: string): string {
  const normalized = label.trim();
  if (/^review\b/i.test(normalized)) {
    return normalized;
  }
  return `Review ${normalized}`;
}

function pushDraft(
  drafts: AutomationDraft[],
  draft: AutomationDraft,
) {
  drafts.push({
    ...draft,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    recommendation: draft.recommendation.trim(),
  });
}

async function loadExistingDedupeKeys(admin: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await admin
    .from("nexus_automation_actions")
    .select("metadata")
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    (data ?? [])
      .map((row) => {
        const metadata = (row.metadata as Record<string, unknown>) ?? {};
        return typeof metadata.dedupe_key === "string" ? metadata.dedupe_key : null;
      })
      .filter((value): value is string => Boolean(value)),
  );
}

async function insertDrafts(
  admin: SupabaseClient,
  drafts: AutomationDraft[],
  existingKeys: Set<string>,
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const draft of drafts) {
    const dedupeKey =
      typeof draft.metadata.dedupe_key === "string" ? draft.metadata.dedupe_key : null;

    if (!dedupeKey || existingKeys.has(dedupeKey)) {
      skipped += 1;
      continue;
    }

    const { error } = await admin.from("nexus_automation_actions").insert({
      action_type: draft.action_type,
      title: draft.title,
      summary: draft.summary,
      recommendation: draft.recommendation,
      source: draft.source,
      status: "proposed",
      approval_required: true,
      metadata: draft.metadata,
    });

    if (error) {
      skipped += 1;
      continue;
    }

    existingKeys.add(dedupeKey);
    created += 1;
  }

  return { created, skipped };
}

async function buildAutomationDrafts(supabase: SupabaseClient): Promise<AutomationDraft[]> {
  const drafts: AutomationDraft[] = [];

  const [
    planning,
    correlations,
    intelligence,
    commands,
    executiveReport,
    weeklyBriefing,
    monthlyBriefing,
  ] = await Promise.all([
    getNexusPlanning(supabase),
    getNexusCorrelations(supabase, { window: "7d", sort: "impact" }),
    getNexusIntelligence(supabase, { sort: "impact" }),
    getNexusCommandsSummary(supabase),
    getExecutiveReportSummary(supabase),
    getWeeklyOwnerBriefing(supabase),
    getMonthlyOwnerBriefing(supabase),
  ]);

  pushDraft(drafts, {
    action_type: "reporting",
    title: "Generate Weekly Briefing",
    summary: weeklyBriefing.headline,
    recommendation:
      "Review the weekly founder briefing and confirm whether any sections need manual follow-up.",
    source: "briefings",
    metadata: {
      dedupe_key: `briefing:weekly:${weeklyBriefing.period_start.slice(0, 10)}`,
      period_start: weeklyBriefing.period_start,
      period_end: weeklyBriefing.period_end,
    },
  });

  pushDraft(drafts, {
    action_type: "reporting",
    title: "Generate Monthly Briefing",
    summary: monthlyBriefing.headline,
    recommendation:
      "Review the monthly founder briefing and note strategic themes for the next planning cycle.",
    source: "briefings",
    metadata: {
      dedupe_key: `briefing:monthly:${monthlyBriefing.period_start.slice(0, 10)}`,
      period_start: monthlyBriefing.period_start,
      period_end: monthlyBriefing.period_end,
    },
  });

  pushDraft(drafts, {
    action_type: "reporting",
    title: "Review Executive Report",
    summary: executiveReport.community_growth.top_growth_signals[0] ?? "Executive report ready for review.",
    recommendation:
      "Scan the executive report snapshot for growth, revenue, and engagement anomalies before approving downstream actions.",
    source: "reports",
    metadata: {
      dedupe_key: `report:executive:${executiveReport.collected_at.slice(0, 10)}`,
      collected_at: executiveReport.collected_at,
    },
  });

  for (const risk of planning.risks) {
    pushDraft(drafts, {
      action_type: mapCategoryToActionType(risk.category, "planning"),
      title: reviewTitle(risk.title),
      summary: risk.summary,
      recommendation: risk.recommendation,
      source: "planning",
      metadata: {
        dedupe_key: `planning:risk:${risk.id}`,
        planning_id: risk.id,
        category: risk.category,
        impact_score: risk.impact_score,
      },
    });
  }

  for (const opportunity of planning.opportunities) {
    pushDraft(drafts, {
      action_type: mapCategoryToActionType(opportunity.category, "planning"),
      title: reviewTitle(opportunity.title),
      summary: opportunity.summary,
      recommendation: opportunity.recommendation,
      source: "planning",
      metadata: {
        dedupe_key: `planning:opportunity:${opportunity.id}`,
        planning_id: opportunity.id,
        category: opportunity.category,
        impact_score: opportunity.impact_score,
      },
    });
  }

  for (const priority of planning.priorities.slice(0, 6)) {
    pushDraft(drafts, {
      action_type: mapCategoryToActionType(priority.category, "planning"),
      title: reviewTitle(priority.title),
      summary: priority.summary,
      recommendation: priority.recommendation,
      source: "planning",
      metadata: {
        dedupe_key: `planning:priority:${priority.id}`,
        planning_id: priority.id,
        urgency: priority.urgency,
      },
    });
  }

  for (const item of correlations.correlations.filter(
    (correlation) => correlation.impact_score >= MIN_IMPACT_SCORE,
  )) {
    pushDraft(drafts, {
      action_type: mapCategoryToActionType(item.category, "correlations"),
      title: reviewTitle(item.title),
      summary: item.summary,
      recommendation: item.recommendation,
      source: "correlations",
      metadata: {
        dedupe_key: `correlation:${item.id}`,
        correlation_id: item.id,
        category: item.category,
        impact_score: item.impact_score,
        confidence_score: item.confidence_score,
      },
    });
  }

  for (const item of intelligence.items.filter((finding) => finding.impact_score >= MIN_IMPACT_SCORE)) {
    pushDraft(drafts, {
      action_type: mapCategoryToActionType(item.category, "intelligence"),
      title: reviewTitle(item.title),
      summary: item.summary,
      recommendation: item.recommendation,
      source: "intelligence",
      metadata: {
        dedupe_key: `intelligence:${item.id}`,
        intelligence_id: item.id,
        category: item.category,
        impact_score: item.impact_score,
      },
    });
  }

  for (const command of commands.commands.filter((row) =>
    ["suggested", "pending_approval"].includes(row.status),
  )) {
    pushDraft(drafts, {
      action_type: "operations",
      title: reviewTitle(command.title),
      summary: command.summary,
      recommendation: command.recommended_action,
      source: "commands",
      metadata: {
        dedupe_key: `command:${command.id}`,
        command_id: command.id,
        command_type: command.command_type,
        command_status: command.status,
      },
    });
  }

  const openIncidents =
    executiveReport.operational_risk.open_incidents_count ??
    executiveReport.snapshot.open_incidents ??
    0;
  if (openIncidents > 0) {
    pushDraft(drafts, {
      action_type: "operations",
      title: "Open War Room",
      summary: `${openIncidents} open incident(s) may require a coordinated war room review.`,
      recommendation:
        "Review open incidents and decide whether to open or update a war room for coordinated response.",
      source: "planning",
      metadata: {
        dedupe_key: `operations:war-room:${new Date().toISOString().slice(0, 10)}`,
        open_incidents: openIncidents,
      },
    });
  }

  const meetsTrend = executiveReport.engagement_intelligence?.meets_this_week ?? 0;
  const postsTrend = executiveReport.engagement_intelligence?.posts_this_week ?? 0;
  if (meetsTrend > 0 && postsTrend <= meetsTrend) {
    pushDraft(drafts, {
      action_type: "engagement",
      title: "Review Meet Participation",
      summary: "Meet activity increased while broader participation signals remained flat.",
      recommendation:
        "Compare meet creation trends with posts and messages to confirm whether participation is keeping pace.",
      source: "reports",
      metadata: {
        dedupe_key: `engagement:meet-participation:${executiveReport.collected_at.slice(0, 10)}`,
        meets_this_week: meetsTrend,
        posts_this_week: postsTrend,
      },
    });
  }

  const estimatedMrr = executiveReport.revenue_intelligence.estimated_mrr;
  if (estimatedMrr != null && estimatedMrr > 0) {
    pushDraft(drafts, {
      action_type: "growth",
      title: "Review Revenue Trend",
      summary: `Estimated MRR is ${estimatedMrr}.`,
      recommendation:
        "Review revenue observations and subscription changes before adjusting growth priorities.",
      source: "reports",
      metadata: {
        dedupe_key: `growth:revenue-trend:${executiveReport.collected_at.slice(0, 10)}`,
        estimated_mrr: estimatedMrr,
      },
    });
  }

  const blackcardMembers = executiveReport.snapshot.blackcard_members;
  if (blackcardMembers != null && blackcardMembers > 0) {
    pushDraft(drafts, {
      action_type: "growth",
      title: "Review Blackcard Growth",
      summary: `${blackcardMembers} active Blackcard member(s) in the latest snapshot.`,
      recommendation:
        "Review Blackcard membership trends alongside revenue and engagement before changing acquisition focus.",
      source: "reports",
      metadata: {
        dedupe_key: `growth:blackcard:${executiveReport.collected_at.slice(0, 10)}`,
        blackcard_members: blackcardMembers,
      },
    });
  }

  const engagementRisk = planning.risks.find((risk) => risk.id === "risk:declining-engagement");
  if (engagementRisk) {
    pushDraft(drafts, {
      action_type: "engagement",
      title: "Review Engagement Changes",
      summary: engagementRisk.summary,
      recommendation: engagementRisk.recommendation,
      source: "planning",
      metadata: {
        dedupe_key: `engagement:changes:${planning.generated_at.slice(0, 10)}`,
        planning_id: engagementRisk.id,
      },
    });
  }

  for (const objective of planning.weekly_objectives.filter((item) => item.on_track === false)) {
    pushDraft(drafts, {
      action_type: mapCategoryToActionType(objective.category, "planning"),
      title: reviewTitle(objective.title),
      summary: objective.summary,
      recommendation: objective.recommendation,
      source: "planning",
      metadata: {
        dedupe_key: `planning:objective:weekly:${objective.id}`,
        planning_id: objective.id,
        horizon: objective.horizon,
      },
    });
  }

  return drafts;
}

export async function generateProposedAutomationActions(
  supabase: SupabaseClient,
): Promise<AutomationGenerationResult> {
  const evaluated_at = new Date().toISOString();

  try {
    const admin = createNexusServiceClient();
    const drafts = await buildAutomationDrafts(supabase);
    const existingKeys = await loadExistingDedupeKeys(admin);
    const { created, skipped } = await insertDrafts(admin, drafts, existingKeys);

    return {
      ok: true,
      evaluated_at,
      drafts_considered: drafts.length,
      actions_created: created,
      actions_skipped: skipped,
    };
  } catch (error) {
    return {
      ok: false,
      evaluated_at,
      drafts_considered: 0,
      actions_created: 0,
      actions_skipped: 0,
      error: error instanceof Error ? error.message : "Automation generation failed",
    };
  }
}
