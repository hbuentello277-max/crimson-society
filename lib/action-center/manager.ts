import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { buildActionCardDraft } from "@/lib/action-center/generator";
import {
  actionStatusAfterMutation,
  canTransitionActionStatus,
} from "@/lib/action-center/transitions";
import type {
  NexusActionCard,
  NexusActionStatus,
  NexusActionType,
  UpdateNexusActionInput,
} from "@/lib/action-center/types";

export function mapActionCardRow(row: Record<string, unknown>): NexusActionCard {
  return {
    id: row.id as string,
    action_category: row.action_category as NexusActionCard["action_category"],
    action_type: row.action_type as NexusActionType,
    title: row.title as string,
    summary: row.summary as string,
    reason: row.reason as string,
    suggested_outcome: row.suggested_outcome as string,
    generated_content: row.generated_content as string,
    status: row.status as NexusActionStatus,
    approval_required: Boolean(row.approval_required ?? true),
    created_by_label: (row.created_by_label as string) ?? "NEXUS",
    created_by_user_id: (row.created_by_user_id as string | null) ?? null,
    approved_at: (row.approved_at as string | null) ?? null,
    approved_by: (row.approved_by as string | null) ?? null,
    executed_at: (row.executed_at as string | null) ?? null,
    executed_by: (row.executed_by as string | null) ?? null,
    rejected_at: (row.rejected_at as string | null) ?? null,
    rejected_by: (row.rejected_by as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function createNexusActionCard(
  supabase: SupabaseClient,
  input: {
    ownerId: string;
    actionType: NexusActionType;
    transcript?: string;
  },
): Promise<{ ok: true; action: NexusActionCard } | { ok: false; error: string }> {
  const draft = await buildActionCardDraft(supabase, input.actionType, {
    transcript: input.transcript,
  });

  const { data, error } = await supabase
    .from("nexus_action_cards")
    .insert({
      ...draft,
      created_by_user_id: input.ownerId,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create action card." };
  }

  const action = mapActionCardRow(data as Record<string, unknown>);

  await logNexusActivity({
    actorId: input.ownerId,
    actorType: "owner",
    action: "action_card.created",
    targetType: "nexus_action_card",
    targetId: action.id,
    details: { action_type: action.action_type, status: action.status },
  });

  return { ok: true, action };
}

export async function updateNexusActionCard(
  supabase: SupabaseClient,
  input: {
    actionId: string;
    ownerId: string;
    patch: UpdateNexusActionInput;
  },
): Promise<{ ok: true; action: NexusActionCard } | { ok: false; error: string }> {
  const { data: existing, error: readError } = await supabase
    .from("nexus_action_cards")
    .select("*")
    .eq("id", input.actionId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }
  if (!existing) {
    return { ok: false, error: "Action card not found." };
  }

  const current = mapActionCardRow(existing as Record<string, unknown>);
  if (!canTransitionActionStatus(current.status, input.patch.action)) {
    return {
      ok: false,
      error: `Cannot ${input.patch.action} action from status ${current.status}.`,
    };
  }

  const now = new Date().toISOString();
  const nextStatus = actionStatusAfterMutation(current.status, input.patch.action);
  const updates: Record<string, unknown> = {
    status: nextStatus,
    updated_at: now,
  };

  if (input.patch.title !== undefined) updates.title = input.patch.title;
  if (input.patch.summary !== undefined) updates.summary = input.patch.summary;
  if (input.patch.reason !== undefined) updates.reason = input.patch.reason;
  if (input.patch.suggested_outcome !== undefined) {
    updates.suggested_outcome = input.patch.suggested_outcome;
  }
  if (input.patch.generated_content !== undefined) {
    updates.generated_content = input.patch.generated_content;
  }

  if (input.patch.action === "approve") {
    updates.approved_at = now;
    updates.approved_by = input.ownerId;
  }
  if (input.patch.action === "reject") {
    updates.rejected_at = now;
    updates.rejected_by = input.ownerId;
  }
  if (input.patch.action === "execute") {
    updates.executed_at = now;
    updates.executed_by = input.ownerId;
  }

  const { data: updated, error: updateError } = await supabase
    .from("nexus_action_cards")
    .update(updates)
    .eq("id", input.actionId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return { ok: false, error: updateError?.message ?? "Failed to update action card." };
  }

  const action = mapActionCardRow(updated as Record<string, unknown>);

  await Promise.all([
    logNexusActivity({
      actorId: input.ownerId,
      actorType: "owner",
      action: `action_card.${input.patch.action}`,
      targetType: "nexus_action_card",
      targetId: action.id,
      details: { status: action.status, action_type: action.action_type },
    }),
    emitNexusEvent({
      source: "manual",
      category: "mission",
      eventType: `action_card.${input.patch.action}`,
      severity: "info",
      title: action.title,
      description: action.summary,
      payload: {
        action_card_id: action.id,
        action_type: action.action_type,
        status: action.status,
      },
    }),
  ]);

  return { ok: true, action };
}
