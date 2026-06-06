import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeMissionHealthFromChecks,
  workflowScoreFromCheckStatus,
} from "@/lib/mission-health/scoring";
import type {
  MissionCheckResult,
  MissionHealthSummary,
  MissionWorkflowCheckSummary,
} from "@/lib/mission-health/types";
import { MISSION_WORKFLOW_REGISTRY, MISSION_WORKFLOW_SLUGS } from "@/lib/mission-health/workflows";

const RECENT_WINDOW_MS = 24 * 60 * 60_000;

type WorkflowRow = {
  id: string;
  slug: string;
  display_name: string;
  category: string;
  status: string;
  weight: number;
  last_check_at: string | null;
  last_success_at: string | null;
  failure_count_1h: number;
  success_count_1h: number;
  success_rate_1h: number | null;
};

type CheckRow = {
  id: string;
  workflow_id: string;
  status: string;
  latency_ms: number | null;
  check_method: string;
  details: Record<string, unknown>;
  checked_at: string;
};

function toMissionCheckResult(
  slug: (typeof MISSION_WORKFLOW_SLUGS)[number],
  row: CheckRow,
): MissionCheckResult {
  const status = row.status as MissionCheckResult["status"];
  return {
    workflow_slug: slug,
    status,
    check_method: row.check_method as MissionCheckResult["check_method"],
    latency_ms: row.latency_ms,
    details: row.details ?? {},
    checked_at: row.checked_at,
    workflow_score: workflowScoreFromCheckStatus(status),
  };
}

export async function getMissionHealthSnapshot(
  supabase: SupabaseClient,
): Promise<MissionHealthSummary> {
  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();

  const [{ data: workflows, error: workflowsError }, { data: checks, error: checksError }] =
    await Promise.all([
      supabase
        .from("nexus_mission_workflows")
        .select(
          "id, slug, display_name, category, status, weight, last_check_at, last_success_at, failure_count_1h, success_count_1h, success_rate_1h",
        )
        .in("slug", [...MISSION_WORKFLOW_SLUGS])
        .order("slug", { ascending: true }),
      supabase
        .from("nexus_mission_checks")
        .select("id, workflow_id, status, latency_ms, check_method, details, checked_at")
        .gte("checked_at", since)
        .order("checked_at", { ascending: false })
        .limit(200),
    ]);

  if (workflowsError) {
    throw new Error(workflowsError.message);
  }

  if (checksError) {
    throw new Error(checksError.message);
  }

  const workflowRows = (workflows ?? []) as WorkflowRow[];
  const workflowById = new Map(workflowRows.map((row) => [row.id, row]));
  const latestCheckByWorkflowId = new Map<string, CheckRow>();

  for (const row of (checks ?? []) as CheckRow[]) {
    if (!latestCheckByWorkflowId.has(row.workflow_id)) {
      latestCheckByWorkflowId.set(row.workflow_id, row);
    }
  }

  const workflowSummaries: MissionWorkflowCheckSummary[] = workflowRows.map((row) => {
    const slug = row.slug as (typeof MISSION_WORKFLOW_SLUGS)[number];
    const latest = latestCheckByWorkflowId.get(row.id);
    const check = latest ? toMissionCheckResult(slug, latest) : null;

    return {
      slug,
      display_name: row.display_name,
      category: row.category,
      weight: Number(row.weight),
      workflow_status: row.status as MissionWorkflowCheckSummary["workflow_status"],
      workflow_score: check?.workflow_score ?? 0,
      last_check_at: row.last_check_at,
      last_success_at: row.last_success_at,
      failure_count_1h: row.failure_count_1h,
      success_count_1h: row.success_count_1h,
      success_rate_1h: row.success_rate_1h,
      check,
    };
  });

  const checkResults = workflowSummaries
    .map((workflow) => workflow.check)
    .filter((check): check is MissionCheckResult => check !== null);

  const { score, status, missionCritical } = computeMissionHealthFromChecks(
    checkResults,
    MISSION_WORKFLOW_REGISTRY,
  );

  const checkedAt = workflowSummaries.reduce<string | null>((latest, row) => {
    if (!row.last_check_at) {
      return latest;
    }

    if (!latest || row.last_check_at > latest) {
      return row.last_check_at;
    }

    return latest;
  }, null);

  return {
    score: checkResults.length > 0 ? score : 0,
    status: checkResults.length > 0 ? status : "unknown",
    checked_at: checkedAt,
    mission_critical: missionCritical,
    workflows: workflowSummaries,
  };
}
