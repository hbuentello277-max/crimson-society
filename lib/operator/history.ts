import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAutomationRow } from "@/lib/automation/manager";
import { mapOperatorExecutionRow } from "@/lib/operator/manager";
import type {
  OperatorDashboard,
  OperatorExecutionWithAction,
  OperatorReadyAction,
} from "@/lib/operator/types";
import {
  getOperatorExecutionProfile,
  resolveOperatorExecutionType,
} from "@/lib/operator/types";

const HISTORY_LIMIT = 80;
const SECTION_LIMIT = 24;

function buildExecutionWithAction(
  executionRow: Record<string, unknown>,
  automationById: Map<string, Record<string, unknown>>,
): OperatorExecutionWithAction {
  const execution = mapOperatorExecutionRow(executionRow);
  const automationRaw = automationById.get(execution.automation_action_id);
  const automation_action = automationRaw
    ? mapAutomationRow(automationRaw)
    : null;

  return {
    execution,
    automation_action,
    profile: getOperatorExecutionProfile(execution.execution_type),
  };
}

export async function getOperatorDashboard(
  supabase: SupabaseClient,
): Promise<OperatorDashboard> {
  const collected_at = new Date().toISOString();

  const [{ data: approvedActions, error: approvedError }, { data: executions, error: execError }] =
    await Promise.all([
      supabase
        .from("nexus_automation_actions")
        .select("*")
        .eq("status", "approved")
        .order("approved_at", { ascending: false })
        .limit(100),
      supabase
        .from("nexus_operator_executions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT),
    ]);

  if (approvedError) {
    throw new Error(approvedError.message);
  }
  if (execError) {
    throw new Error(execError.message);
  }

  const automationRows = (approvedActions ?? []) as Record<string, unknown>[];
  const executionRows = (executions ?? []) as Record<string, unknown>[];

  const automationById = new Map<string, Record<string, unknown>>();
  for (const row of automationRows) {
    automationById.set(row.id as string, row);
  }

  const activeByAutomationId = new Set<string>();
  for (const row of executionRows) {
    const status = row.status as string;
    if (status === "queued" || status === "running") {
      activeByAutomationId.add(row.automation_action_id as string);
    }
  }

  const ready: OperatorReadyAction[] = [];

  for (const row of automationRows) {
    const automation_action = mapAutomationRow(row);
    const executionType = resolveOperatorExecutionType(automation_action);
    if (!executionType) continue;
    if (activeByAutomationId.has(automation_action.id)) continue;

    ready.push({
      automation_action,
      execution_type: executionType,
      profile: getOperatorExecutionProfile(executionType),
    });
  }

  const withActions = executionRows.map((row) =>
    buildExecutionWithAction(row, automationById),
  );

  const running = withActions
    .filter((item) => item.execution.status === "queued" || item.execution.status === "running")
    .slice(0, SECTION_LIMIT);

  const completed = withActions
    .filter((item) => item.execution.status === "completed")
    .slice(0, SECTION_LIMIT);

  const failed = withActions
    .filter((item) => item.execution.status === "failed")
    .slice(0, SECTION_LIMIT);

  return {
    collected_at,
    ready: ready.slice(0, SECTION_LIMIT),
    running,
    completed,
    failed,
    history: withActions,
  };
}
