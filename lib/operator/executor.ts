import type { SupabaseClient } from "@supabase/supabase-js";
import { getMonthlyOwnerBriefing } from "@/lib/briefings/monthly";
import { getWeeklyOwnerBriefing } from "@/lib/briefings/weekly";
import { getNexusCorrelations } from "@/lib/correlations/summary";
import { getNexusIntelligence } from "@/lib/intelligence/engine";
import { generateNexusMemoryEntries } from "@/lib/memory/generator";
import { runNexusMetricsRollup } from "@/lib/metrics/rollup";
import { runNexusMissionHealthEngine } from "@/lib/mission-health/engine";
import { runNexusHealthEngine } from "@/lib/monitoring/engine";
import { getNexusPlanning } from "@/lib/planning/engine";
import { getExecutiveReportSummary } from "@/lib/reports/summary";
import { getMonthlyExecutiveReport } from "@/lib/reports/monthly";
import { getWeeklyExecutiveReport } from "@/lib/reports/weekly";
import type { NexusOperatorExecutionType } from "@/lib/nexus/constants";

export type OperatorExecutionRunResult = {
  ok: boolean;
  error?: string;
  details: Record<string, unknown>;
};

export async function runOperatorExecution(
  supabase: SupabaseClient,
  executionType: NexusOperatorExecutionType,
): Promise<OperatorExecutionRunResult> {
  switch (executionType) {
    case "refresh_health": {
      const result = await runNexusHealthEngine();
      return {
        ok: result.ok,
        error: result.error,
        details: {
          system_status: result.systemStatus,
          integrations_checked: result.integrations.length,
          checks_recorded: result.checksRecorded,
        },
      };
    }
    case "refresh_metrics": {
      const result = await runNexusMetricsRollup();
      return {
        ok: result.ok,
        error: result.error,
        details: {
          snapshots_written: result.snapshotsRecorded,
          collected_at: result.collectedAt,
        },
      };
    }
    case "refresh_mission": {
      const result = await runNexusMissionHealthEngine();
      return {
        ok: result.ok,
        error: result.error,
        details: {
          workflows_updated: result.workflows.length,
          status: result.status,
        },
      };
    }
    case "refresh_intelligence": {
      try {
        const intelligence = await getNexusIntelligence(supabase, { sort: "impact" });
        return {
          ok: true,
          details: {
            collected_at: intelligence.collected_at,
            items: intelligence.items.length,
            counts: intelligence.counts,
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Intelligence refresh failed",
          details: {},
        };
      }
    }
    case "refresh_correlations": {
      try {
        const correlations = await getNexusCorrelations(supabase, {
          window: "7d",
          sort: "impact",
        });
        return {
          ok: true,
          details: {
            generated_at: correlations.generated_at,
            correlations: correlations.correlations.length,
            window: correlations.window,
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Correlations refresh failed",
          details: {},
        };
      }
    }
    case "refresh_reports": {
      try {
        const [summary, weekly, monthly] = await Promise.all([
          getExecutiveReportSummary(supabase),
          getWeeklyExecutiveReport(supabase),
          getMonthlyExecutiveReport(supabase),
        ]);
        return {
          ok: true,
          details: {
            collected_at: summary.collected_at,
            weekly_period_start: weekly.period_start,
            monthly_period_start: monthly.period_start,
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Reports refresh failed",
          details: {},
        };
      }
    }
    case "refresh_briefings": {
      try {
        const [weekly, monthly] = await Promise.all([
          getWeeklyOwnerBriefing(supabase),
          getMonthlyOwnerBriefing(supabase),
        ]);
        return {
          ok: true,
          details: {
            weekly_period_start: weekly.period_start,
            monthly_period_start: monthly.period_start,
            weekly_headline: weekly.headline,
            monthly_headline: monthly.headline,
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Briefings refresh failed",
          details: {},
        };
      }
    }
    case "refresh_memory": {
      const result = await generateNexusMemoryEntries(supabase);
      return {
        ok: result.ok,
        error: result.error,
        details: {
          evaluated_at: result.evaluated_at,
          entries_created: result.entries_created,
          entries_skipped: result.entries_skipped,
        },
      };
    }
    case "refresh_planning": {
      try {
        const planning = await getNexusPlanning(supabase);
        return {
          ok: true,
          details: {
            generated_at: planning.generated_at,
            counts: planning.counts,
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Planning refresh failed",
          details: {},
        };
      }
    }
    case "operational_snapshot": {
      const [health, metrics, mission, summary] = await Promise.all([
        runNexusHealthEngine(),
        runNexusMetricsRollup(),
        runNexusMissionHealthEngine(),
        getExecutiveReportSummary(supabase),
      ]);

      const ok = health.ok && metrics.ok && mission.ok;
      const errors = [
        !health.ok ? health.error : null,
        !metrics.ok ? metrics.error : null,
        !mission.ok ? mission.error : null,
      ].filter(Boolean);

      return {
        ok,
        error: errors.length > 0 ? errors.join("; ") : undefined,
        details: {
          collected_at: summary.collected_at,
          health_status: health.systemStatus,
          metrics_collected_at: metrics.collectedAt,
          mission_status: mission.status,
        },
      };
    }
    default:
      return {
        ok: false,
        error: "Unsupported execution type",
        details: {},
      };
  }
}
