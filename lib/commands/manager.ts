import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { mapCommandRow } from "@/lib/commands/mapper";
import type {
  CommandDbRow,
  UpdateCommandResult,
  UpdateCommandStatusAction,
} from "@/lib/commands/types";
import type { NexusCommandStatus } from "@/lib/nexus/constants";

const TRANSITIONS: Record<
  UpdateCommandStatusAction,
  { from: NexusCommandStatus[]; to: NexusCommandStatus; eventType: string }
> = {
  approve: {
    from: ["suggested", "pending_approval"],
    to: "approved",
    eventType: "command.approved",
  },
  reject: {
    from: ["suggested", "pending_approval", "approved"],
    to: "rejected",
    eventType: "command.rejected",
  },
  dismiss: {
    from: ["suggested", "pending_approval"],
    to: "dismissed",
    eventType: "command.dismissed",
  },
  complete: {
    from: ["approved"],
    to: "completed",
    eventType: "command.completed",
  },
};

export async function updateOwnerCommandStatus(
  supabase: SupabaseClient,
  input: {
    commandId: string;
    ownerId: string;
    action: UpdateCommandStatusAction;
  },
): Promise<UpdateCommandResult> {
  const rule = TRANSITIONS[input.action];

  const { data: existing, error: readError } = await supabase
    .from("nexus_commands")
    .select("*")
    .eq("id", input.commandId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!existing) {
    return { ok: false, error: "Command not found" };
  }

  const currentStatus = existing.status as NexusCommandStatus;
  if (!rule.from.includes(currentStatus)) {
    return {
      ok: false,
      error: `Cannot ${input.action} command from status ${currentStatus}`,
    };
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: rule.to,
    updated_at: now,
  };

  if (input.action === "approve") {
    updates.approved_at = now;
    updates.approved_by = input.ownerId;
  }

  if (input.action === "reject") {
    updates.rejected_at = now;
    updates.rejected_by = input.ownerId;
  }

  const { data: updated, error: updateError } = await supabase
    .from("nexus_commands")
    .update(updates)
    .eq("id", input.commandId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return { ok: false, error: updateError?.message ?? "Failed to update command" };
  }

  const command = mapCommandRow(updated as Record<string, unknown>);

  const event = await emitNexusEvent({
    source: "manual",
    category: "infra",
    eventType: rule.eventType,
    severity: command.risk_level === "high" ? "warning" : "info",
    title: command.title,
    description: command.summary,
    payload: {
      command_id: command.id,
      action: input.action,
      owner_id: input.ownerId,
      status: command.status,
    },
  });

  await logNexusActivity({
    actorId: input.ownerId,
    actorType: "owner",
    action: `nexus.command.${input.action}`,
    targetType: "nexus_command",
    targetId: command.id,
    details: {
      previous_status: currentStatus,
      status: command.status,
    },
  });

  return { ok: true, command, event_emitted: event.ok };
}

export async function getNexusCommandById(
  supabase: SupabaseClient,
  commandId: string,
): Promise<CommandDbRow | null> {
  const { data, error } = await supabase
    .from("nexus_commands")
    .select("*")
    .eq("id", commandId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapCommandRow(data as Record<string, unknown>) : null;
}
