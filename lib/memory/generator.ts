import type { SupabaseClient } from "@supabase/supabase-js";
import { getMonthlyOwnerBriefing } from "@/lib/briefings/monthly";
import { getWeeklyOwnerBriefing } from "@/lib/briefings/weekly";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import { createNexusServiceClient } from "@/lib/nexus/client";
import { getExecutiveReportSummary } from "@/lib/reports/summary";
import { getMonthlyExecutiveReport } from "@/lib/reports/monthly";
import { getWeeklyExecutiveReport } from "@/lib/reports/weekly";
import { getNexusMetricsSummary } from "@/lib/metrics/summary";
import { METRIC_KEYS } from "@/lib/metrics/types";
import type { MemoryDraft, MemoryGenerationResult } from "@/lib/memory/types";

const GROWTH_MILESTONES = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
const REVENUE_MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000];

function periodKey(prefix: string, start: string, end: string) {
  return `${prefix}:${start.slice(0, 10)}:${end.slice(0, 10)}`;
}

async function loadExistingDedupeKeys(admin: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await admin
    .from("nexus_memory_entries")
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
  drafts: MemoryDraft[],
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

    const { error } = await admin.from("nexus_memory_entries").insert({
      entry_type: draft.entry_type,
      title: draft.title,
      summary: draft.summary,
      source: draft.source,
      importance_score: draft.importance_score,
      occurred_at: draft.occurred_at,
      metadata: draft.metadata,
      created_by: draft.created_by ?? null,
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

async function buildMemoryDrafts(supabase: SupabaseClient): Promise<MemoryDraft[]> {
  const admin = createNexusServiceClient();
  const drafts: MemoryDraft[] = [];
  const now = new Date().toISOString();

  const [
    { data: deployments },
    { data: incidents },
    { data: alerts },
    { data: commands },
    metricsSummary,
    weeklyBriefing,
    monthlyBriefing,
    executiveSummary,
    weeklyReport,
    monthlyReport,
    intelligence,
  ] = await Promise.all([
    admin
      .from("nexus_deployments")
      .select("id, deployment_id, environment, status, commit_message, branch, started_at, finished_at")
      .eq("environment", "production")
      .order("started_at", { ascending: false })
      .limit(20),
    admin
      .from("nexus_incidents")
      .select("id, title, status, severity, started_at, resolved_at, impact_summary")
      .order("updated_at", { ascending: false })
      .limit(40),
    admin
      .from("nexus_alerts")
      .select("id, title, message, severity, status, created_at, resolved_at")
      .eq("severity", "critical")
      .order("updated_at", { ascending: false })
      .limit(40),
    admin
      .from("nexus_commands")
      .select("id, title, summary, status, updated_at, created_at")
      .in("status", ["approved", "completed", "executed"])
      .order("updated_at", { ascending: false })
      .limit(30),
    getNexusMetricsSummary(supabase),
    getWeeklyOwnerBriefing(supabase),
    getMonthlyOwnerBriefing(supabase),
    getExecutiveReportSummary(supabase),
    getWeeklyExecutiveReport(supabase),
    getMonthlyExecutiveReport(supabase),
    getNexusIntelligence(supabase),
  ]);

  for (const deployment of deployments ?? []) {
    if (deployment.status !== "ready") continue;

    drafts.push({
      entry_type: "deployment",
      title: `Production deployment ${deployment.deployment_id}`,
      summary:
        (deployment.commit_message as string | null)?.slice(0, 240) ||
        `Deployment on ${deployment.branch ?? "main"} reached ready state.`,
      source: "deployments",
      importance_score: 7,
      occurred_at: (deployment.finished_at as string | null) ?? (deployment.started_at as string),
      metadata: {
        dedupe_key: `deployment:${deployment.deployment_id}`,
        deployment_id: deployment.id,
        environment: deployment.environment,
        status: deployment.status,
      },
    });
  }

  for (const incident of incidents ?? []) {
    const isResolved = ["resolved", "postmortem"].includes(incident.status as string);
    drafts.push({
      entry_type: "incident",
      title: incident.title as string,
      summary:
        (incident.impact_summary as string | null) ||
        `Incident ${incident.status} (${incident.severity}).`,
      source: "incidents",
      importance_score: incident.severity === "critical" ? 9 : 7,
      occurred_at:
        (isResolved ? (incident.resolved_at as string | null) : null) ??
        (incident.started_at as string),
      metadata: {
        dedupe_key: `incident:${incident.id}:${incident.status}`,
        incident_id: incident.id,
        status: incident.status,
        severity: incident.severity,
      },
    });
  }

  for (const alert of alerts ?? []) {
    drafts.push({
      entry_type: "alert",
      title: alert.title as string,
      summary: alert.message as string,
      source: "alerts",
      importance_score: 8,
      occurred_at:
        (alert.resolved_at as string | null) ??
        (alert.created_at as string),
      metadata: {
        dedupe_key: `alert:${alert.id}:${alert.status}`,
        alert_id: alert.id,
        status: alert.status,
        severity: alert.severity,
      },
    });
  }

  for (const command of commands ?? []) {
    drafts.push({
      entry_type: "command",
      title: command.title as string,
      summary: command.summary as string,
      source: "commands",
      importance_score: command.status === "completed" || command.status === "executed" ? 7 : 6,
      occurred_at: (command.updated_at as string) ?? (command.created_at as string),
      metadata: {
        dedupe_key: `command:${command.id}:${command.status}`,
        command_id: command.id,
        status: command.status,
      },
    });
  }

  drafts.push({
    entry_type: "briefing",
    title: "Weekly owner briefing",
    summary: weeklyBriefing.headline,
    source: "briefings",
    importance_score: 6,
    occurred_at: weeklyBriefing.generated_at,
    metadata: {
      dedupe_key: periodKey("briefing:weekly", weeklyBriefing.period_start, weeklyBriefing.period_end),
      briefing_type: "weekly",
      period_start: weeklyBriefing.period_start,
      period_end: weeklyBriefing.period_end,
    },
  });

  drafts.push({
    entry_type: "briefing",
    title: "Monthly owner briefing",
    summary: monthlyBriefing.headline,
    source: "briefings",
    importance_score: 7,
    occurred_at: monthlyBriefing.generated_at,
    metadata: {
      dedupe_key: periodKey("briefing:monthly", monthlyBriefing.period_start, monthlyBriefing.period_end),
      briefing_type: "monthly",
      period_start: monthlyBriefing.period_start,
      period_end: monthlyBriefing.period_end,
    },
  });

  drafts.push({
    entry_type: "report",
    title: "Executive snapshot",
    summary: `Platform snapshot with ${executiveSummary.snapshot.total_users ?? "—"} members and ${executiveSummary.snapshot.open_alerts ?? 0} open alerts.`,
    source: "reports",
    importance_score: 5,
    occurred_at: executiveSummary.collected_at,
    metadata: {
      dedupe_key: `report:executive:${executiveSummary.collected_at.slice(0, 13)}`,
      report_type: "executive",
    },
  });

  drafts.push({
    entry_type: "report",
    title: "Weekly executive report",
    summary: weeklyReport.operational_summary.headline,
    source: "reports",
    importance_score: 6,
    occurred_at: weeklyReport.generated_at,
    metadata: {
      dedupe_key: periodKey("report:weekly", weeklyReport.period_start, weeklyReport.period_end),
      report_type: "weekly",
    },
  });

  drafts.push({
    entry_type: "report",
    title: "Monthly executive report",
    summary: monthlyReport.operational_summary.headline,
    source: "reports",
    importance_score: 7,
    occurred_at: monthlyReport.generated_at,
    metadata: {
      dedupe_key: periodKey("report:monthly", monthlyReport.period_start, monthlyReport.period_end),
      report_type: "monthly",
    },
  });

  for (const item of intelligence.items.slice(0, 12)) {
    drafts.push({
      entry_type: "intelligence",
      title: item.title,
      summary: item.summary,
      source: "intelligence",
      importance_score: Math.min(10, Math.max(4, Math.round(item.impact_score / 10))),
      occurred_at: intelligence.collected_at,
      metadata: {
        dedupe_key: `intelligence:${item.id}`,
        intelligence_id: item.id,
        category: item.category,
        impact_score: item.impact_score,
        confidence_score: item.confidence_score,
      },
    });
  }

  const totalUsers = metricsSummary.growth.total_users;
  const estimatedMrr = metricsSummary.revenue.estimated_mrr;
  const metricsCollectedAt = metricsSummary.collected_at ?? now;

  if (totalUsers != null && Number.isFinite(totalUsers)) {
    for (const threshold of GROWTH_MILESTONES) {
      if (totalUsers < threshold) continue;

      drafts.push({
        entry_type: totalUsers === threshold ? "milestone" : "growth",
        title: `${threshold.toLocaleString()} member milestone`,
        summary: `Crimson Society reached ${threshold.toLocaleString()} total members.`,
        source: "metrics",
        importance_score: threshold >= 1000 ? 8 : 6,
        occurred_at: metricsCollectedAt,
        metadata: {
          dedupe_key: `growth:milestone:${threshold}`,
          metric_key: METRIC_KEYS.GROWTH_TOTAL_USERS,
          threshold,
          value: totalUsers,
        },
      });
    }
  }

  if (estimatedMrr != null && Number.isFinite(estimatedMrr)) {
    for (const threshold of REVENUE_MILESTONES) {
      if (estimatedMrr < threshold) continue;

      drafts.push({
        entry_type: estimatedMrr === threshold ? "milestone" : "revenue",
        title: `$${threshold.toLocaleString()} MRR milestone`,
        summary: `Estimated monthly recurring revenue reached $${threshold.toLocaleString()}.`,
        source: "metrics",
        importance_score: threshold >= 10000 ? 8 : 6,
        occurred_at: metricsCollectedAt,
        metadata: {
          dedupe_key: `revenue:milestone:${threshold}`,
          metric_key: METRIC_KEYS.REVENUE_MRR,
          threshold,
          value: estimatedMrr,
        },
      });
    }
  }

  return drafts;
}

export async function generateNexusMemoryEntries(
  supabase: SupabaseClient,
): Promise<MemoryGenerationResult> {
  const evaluated_at = new Date().toISOString();

  try {
    const admin = createNexusServiceClient();
    const drafts = await buildMemoryDrafts(supabase);
    const existingKeys = await loadExistingDedupeKeys(admin);
    const { created, skipped } = await insertDrafts(admin, drafts, existingKeys);

    return {
      ok: true,
      evaluated_at,
      drafts_considered: drafts.length,
      entries_created: created,
      entries_skipped: skipped,
    };
  } catch (error) {
    return {
      ok: false,
      evaluated_at,
      drafts_considered: 0,
      entries_created: 0,
      entries_skipped: 0,
      error: error instanceof Error ? error.message : "Memory generation failed",
    };
  }
}
