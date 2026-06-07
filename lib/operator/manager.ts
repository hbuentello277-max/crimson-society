import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAutomationRow } from "@/lib/automation/manager";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { runOperatorExecution } from "@/lib/operator/executor";
import type {
  ExecuteOperatorResult,
  OperatorExecutionDbRow,
} from "@/lib/operator/types";
import {
  getOperatorExecutionProfile,
  isAllowedOperatorExecutionType,
  resolveOperatorExecutionType,
} from "@/lib/operator/types";

export function mapOperatorExecutionRow(
  row: Record<string, unknown>,
): OperatorExecutionDbRow {
  return {
    id: row.id as string,
    automation_action_id: row.automation_action_id as string,
    execution_type: row.execution_type as OperatorExecutionDbRow["execution_type"],
    status: row.status as OperatorExecutionDbRow["status"],
    started_at: (row.started_at as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    executed_by: (row.executed_by as string | null) ?? null,
    result: (row.result as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
  };
}

async function logOperatorAudit(input: {
  ownerId: string;
  eventType: string;
  title: string;
  description: string;
  execution: OperatorExecutionDbRow;
  automationTitle?: string;
}) {
  await emitNexusEvent({
    source: "manual",
    category: "infra",
    eventType: input.eventType,
    severity: input.execution.status === "failed" ? "warning" : "info",
    title: input.title,
    description: input.description,
    payload: {
      execution_id: input.execution.id,
      automation_action_id: input.execution.automation_action_id,
      execution_type: input.execution.execution_type,
      status: input.execution.status,
      owner_id: input.ownerId,
      automation_title: input.automationTitle ?? null,
    },
  });

  await logNexusActivity({
    actorId: input.ownerId,
    actorType: "owner",
    action: `nexus.operator.${input.eventType.split(".").pop()}`,
    targetType: "nexus_operator_execution",
    targetId: input.execution.id,
    details: {
      automation_action_id: input.execution.automation_action_id,
      execution_type: input.execution.execution_type,
      status: input.execution.status,
    },
  });
}

export async function executeApprovedAutomationAction(
  supabase: SupabaseClient,
  input: {
    automationActionId: string;
    ownerId: string;
  },
): Promise<ExecuteOperatorResult> {
  const { data: automationRow, error: automationError } = await supabase
    .from("nexus_automation_actions")
    .select("*")
    .eq("id", input.automationActionId)
    .maybeSingle();

  if (automationError) {
    return { ok: false, error: automationError.message };
  }

  if (!automationRow) {
    return { ok: false, error: "Automation action not found" };
  }

  const automationAction = mapAutomationRow(automationRow as Record<string, unknown>);

  if (automationAction.status !== "approved") {
    return {
      ok: false,
      error: "Automation action must be approved before execution",
    };
  }

  const executionType = resolveOperatorExecutionType(automationAction);
  if (!executionType || !isAllowedOperatorExecutionType(executionType)) {
    return {
      ok: false,
      error: "Automation action is not eligible for operator execution",
    };
  }

  const { data: activeExecution, error: activeError } = await supabase
    .from("nexus_operator_executions")
    .select("id, status")
    .eq("automation_action_id", input.automationActionId)
    .in("status", ["queued", "running"])
    .limit(1)
    .maybeSingle();

  if (activeError) {
    return { ok: false, error: activeError.message };
  }

  if (activeExecution) {
    return {
      ok: false,
      error: "An execution is already queued or running for this automation action",
    };
  }

  const profile = getOperatorExecutionProfile(executionType);
  const now = new Date().toISOString();

  const { data: created, error: createError } = await supabase
    .from("nexus_operator_executions")
    .insert({
      automation_action_id: input.automationActionId,
      execution_type: executionType,
      status: "queued",
      executed_by: input.ownerId,
      metadata: {
        automation_title: automationAction.title,
        profile_label: profile.label,
      },
    })
    .select("*")
    .single();

  if (createError || !created) {
    return { ok: false, error: createError?.message ?? "Failed to queue execution" };
  }

  let execution = mapOperatorExecutionRow(created as Record<string, unknown>);

  await logOperatorAudit({
    ownerId: input.ownerId,
    eventType: "operator.execution.requested",
    title: profile.label,
    description: `Execution requested for approved automation action: ${automationAction.title}`,
    execution,
    automationTitle: automationAction.title,
  });

  const { data: runningRow, error: runningError } = await supabase
    .from("nexus_operator_executions")
    .update({
      status: "running",
      started_at: now,
    })
    .eq("id", execution.id)
    .select("*")
    .single();

  if (runningError || !runningRow) {
    return { ok: false, error: runningError?.message ?? "Failed to start execution" };
  }

  execution = mapOperatorExecutionRow(runningRow as Record<string, unknown>);

  await logOperatorAudit({
    ownerId: input.ownerId,
    eventType: "operator.execution.started",
    title: profile.label,
    description: `Execution started for ${automationAction.title}`,
    execution,
    automationTitle: automationAction.title,
  });

  const runResult = await runOperatorExecution(supabase, executionType);
  const completedAt = new Date().toISOString();
  const finalStatus = runResult.ok ? "completed" : "failed";

  const { data: finishedRow, error: finishError } = await supabase
    .from("nexus_operator_executions")
    .update({
      status: finalStatus,
      completed_at: completedAt,
      result: {
        ok: runResult.ok,
        error: runResult.error ?? null,
        details: runResult.details,
      },
    })
    .eq("id", execution.id)
    .select("*")
    .single();

  if (finishError || !finishedRow) {
    return { ok: false, error: finishError?.message ?? "Failed to finalize execution" };
  }

  execution = mapOperatorExecutionRow(finishedRow as Record<string, unknown>);

  await logOperatorAudit({
    ownerId: input.ownerId,
    eventType: runResult.ok ? "operator.execution.completed" : "operator.execution.failed",
    title: profile.label,
    description: runResult.ok
      ? `Execution completed for ${automationAction.title}`
      : runResult.error ?? `Execution failed for ${automationAction.title}`,
    execution,
    automationTitle: automationAction.title,
  });

  if (!runResult.ok) {
    return {
      ok: true,
      execution,
      run_ok: false,
      run_error: runResult.error ?? "Execution failed",
    };
  }

  return { ok: true, execution, run_ok: true };
}
