import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import type {
  AutomationActionDbRow,
  UpdateAutomationResult,
  UpdateAutomationStatusAction,
} from "@/lib/automation/types";
import type { NexusAutomationStatus } from "@/lib/nexus/constants";

const TRANSITIONS: Record<
  UpdateAutomationStatusAction,
  { from: NexusAutomationStatus[]; to: NexusAutomationStatus; eventType: string }
> = {
  approve: {
    from: ["proposed"],
    to: "approved",
    eventType: "automation.approved",
  },
  reject: {
    from: ["proposed", "approved"],
    to: "rejected",
    eventType: "automation.rejected",
  },
  archive: {
    from: ["proposed", "approved", "rejected"],
    to: "archived",
    eventType: "automation.archived",
  },
};

export function mapAutomationRow(row: Record<string, unknown>): AutomationActionDbRow {
  return {
    id: row.id as string,
    action_type: row.action_type as AutomationActionDbRow["action_type"],
    title: row.title as string,
    summary: row.summary as string,
    recommendation: row.recommendation as string,
    source: row.source as string,
    status: row.status as AutomationActionDbRow["status"],
    approval_required: Boolean(row.approval_required ?? true),
    approved_at: (row.approved_at as string | null) ?? null,
    approved_by: (row.approved_by as string | null) ?? null,
    created_at: row.created_at as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export async function updateOwnerAutomationStatus(
  supabase: SupabaseClient,
  input: {
    actionId: string;
    ownerId: string;
    action: UpdateAutomationStatusAction;
  },
): Promise<UpdateAutomationResult> {
  const rule = TRANSITIONS[input.action];

  const { data: existing, error: readError } = await supabase
    .from("nexus_automation_actions")
    .select("*")
    .eq("id", input.actionId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!existing) {
    return { ok: false, error: "Automation action not found" };
  }

  const currentStatus = existing.status as NexusAutomationStatus;
  if (!rule.from.includes(currentStatus)) {
    return {
      ok: false,
      error: `Cannot ${input.action} automation action from status ${currentStatus}`,
    };
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: rule.to,
  };

  if (input.action === "approve") {
    updates.approved_at = now;
    updates.approved_by = input.ownerId;
  }

  const { data: updated, error: updateError } = await supabase
    .from("nexus_automation_actions")
    .update(updates)
    .eq("id", input.actionId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return { ok: false, error: updateError?.message ?? "Failed to update automation action" };
  }

  const automationAction = mapAutomationRow(updated as Record<string, unknown>);

  const event = await emitNexusEvent({
    source: "manual",
    category: "infra",
    eventType: rule.eventType,
    severity: "info",
    title: automationAction.title,
    description: automationAction.summary,
    payload: {
      automation_action_id: automationAction.id,
      action: input.action,
      owner_id: input.ownerId,
      status: automationAction.status,
      action_type: automationAction.action_type,
      source: automationAction.source,
    },
  });

  await logNexusActivity({
    actorId: input.ownerId,
    actorType: "owner",
    action: `nexus.automation.${input.action}`,
    targetType: "nexus_automation_action",
    targetId: automationAction.id,
    details: {
      previous_status: currentStatus,
      status: automationAction.status,
      action_type: automationAction.action_type,
      source: automationAction.source,
    },
  });

  return { ok: true, action: automationAction, event_emitted: event.ok };
}

export async function getAutomationActionById(
  supabase: SupabaseClient,
  actionId: string,
): Promise<AutomationActionDbRow | null> {
  const { data, error } = await supabase
    .from("nexus_automation_actions")
    .select("*")
    .eq("id", actionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAutomationRow(data as Record<string, unknown>) : null;
}
