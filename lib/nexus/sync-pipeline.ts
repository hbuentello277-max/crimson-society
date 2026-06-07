import type { SupabaseClient } from "@supabase/supabase-js";
import { runNexusAlertEngine } from "@/lib/alerts/engine";
import { generateNexusCommandSuggestions } from "@/lib/commands/generator";
import { getMonthlyOwnerBriefing } from "@/lib/briefings/monthly";
import { getWeeklyOwnerBriefing } from "@/lib/briefings/weekly";
import { runNexusMetricsRollup } from "@/lib/metrics/rollup";
import { runNexusMissionHealthEngine } from "@/lib/mission-health/engine";
import { runNexusHealthEngine } from "@/lib/monitoring/engine";
import { runNexusObservationEngine } from "@/lib/observations/engine";
import { generateNexusMemoryEntries } from "@/lib/memory/generator";
import { getExecutiveReportSummary } from "@/lib/reports/summary";
import { getWeeklyExecutiveReport } from "@/lib/reports/weekly";
import { getMonthlyExecutiveReport } from "@/lib/reports/monthly";

export type NexusSyncStepResult = {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
};

export type NexusSyncPipelineResult = {
  ok: boolean;
  synced_at: string;
  health: NexusSyncStepResult;
  mission: NexusSyncStepResult;
  metrics: NexusSyncStepResult;
  alerts: NexusSyncStepResult;
  observations: NexusSyncStepResult;
  commands: NexusSyncStepResult;
  reports: NexusSyncStepResult;
  briefings: NexusSyncStepResult;
  memory: NexusSyncStepResult;
  errors: string[];
};

function stepResult(
  result: { ok: boolean; error?: string } & Record<string, unknown>,
): NexusSyncStepResult {
  const { ok, error, ...rest } = result;
  return {
    ok,
    error,
    ...rest,
  };
}

async function warmReportsCache(supabase: SupabaseClient): Promise<NexusSyncStepResult> {
  try {
    const [summary, weekly, monthly] = await Promise.all([
      getExecutiveReportSummary(supabase),
      getWeeklyExecutiveReport(supabase),
      getMonthlyExecutiveReport(supabase),
    ]);

    return {
      ok: true,
      collected_at: summary.collected_at,
      weekly_period_start: weekly.period_start,
      monthly_period_start: monthly.period_start,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to warm reports cache",
    };
  }
}

async function warmBriefingsCache(supabase: SupabaseClient): Promise<NexusSyncStepResult> {
  try {
    const [weekly, monthly] = await Promise.all([
      getWeeklyOwnerBriefing(supabase),
      getMonthlyOwnerBriefing(supabase),
    ]);

    return {
      ok: true,
      weekly_period_start: weekly.period_start,
      monthly_period_start: monthly.period_start,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to warm briefings cache",
    };
  }
}

export async function runNexusSyncPipeline(
  supabase: SupabaseClient,
): Promise<NexusSyncPipelineResult> {
  const synced_at = new Date().toISOString();
  const errors: string[] = [];

  const [health, mission, metrics] = await Promise.all([
    runNexusHealthEngine(),
    runNexusMissionHealthEngine(),
    runNexusMetricsRollup(),
  ]);

  if (!health.ok) errors.push(health.error ?? "Health refresh failed");
  if (!mission.ok) errors.push(mission.error ?? "Mission workflow refresh failed");
  if (!metrics.ok) errors.push(metrics.error ?? "Metrics refresh failed");

  const alerts = await runNexusAlertEngine();
  if (!alerts.ok) errors.push(alerts.error ?? "Alert evaluation failed");

  const observations = await runNexusObservationEngine();
  if (!observations.ok) errors.push(observations.error ?? "Observation evaluation failed");

  const commands = await generateNexusCommandSuggestions();
  if (!commands.ok) errors.push(commands.error ?? "Command suggestion refresh failed");

  const reports = await warmReportsCache(supabase);
  if (!reports.ok && reports.error) errors.push(reports.error);

  const briefings = await warmBriefingsCache(supabase);
  if (!briefings.ok && briefings.error) errors.push(briefings.error);

  const memory = await generateNexusMemoryEntries(supabase);
  if (!memory.ok) errors.push(memory.error ?? "Memory generation failed");

  const ok =
    health.ok &&
    mission.ok &&
    metrics.ok &&
    alerts.ok &&
    observations.ok &&
    commands.ok &&
    reports.ok &&
    briefings.ok &&
    memory.ok;

  return {
    ok,
    synced_at,
    health: stepResult(health),
    mission: stepResult(mission),
    metrics: stepResult(metrics),
    alerts: stepResult(alerts),
    observations: stepResult(observations),
    commands: stepResult(commands),
    reports,
    briefings,
    memory: stepResult(memory),
    errors,
  };
}
