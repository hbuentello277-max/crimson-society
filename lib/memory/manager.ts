import type { SupabaseClient } from "@supabase/supabase-js";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import type {
  CreateOwnerNoteInput,
  MemoryEntryDbRow,
  UpdateOwnerNoteInput,
} from "@/lib/memory/types";

export function mapMemoryRow(row: Record<string, unknown>): MemoryEntryDbRow {
  return {
    id: row.id as string,
    entry_type: row.entry_type as MemoryEntryDbRow["entry_type"],
    title: row.title as string,
    summary: row.summary as string,
    source: row.source as string,
    importance_score: Number(row.importance_score ?? 5),
    occurred_at: row.occurred_at as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export async function createOwnerNote(
  supabase: SupabaseClient,
  ownerId: string,
  input: CreateOwnerNoteInput,
): Promise<{ ok: true; entry: MemoryEntryDbRow } | { ok: false; error: string }> {
  const title = input.title?.trim();
  const summary = input.summary?.trim();

  if (!title || !summary) {
    return { ok: false, error: "title and summary are required" };
  }

  const importance = input.importance_score ?? 6;
  if (!Number.isFinite(importance) || importance < 1 || importance > 10) {
    return { ok: false, error: "importance_score must be between 1 and 10" };
  }

  const occurredAt = input.occurred_at ?? new Date().toISOString();
  const dedupeKey = `owner_note:${ownerId}:${occurredAt}:${title.toLowerCase().slice(0, 48)}`;

  const { data, error } = await supabase
    .from("nexus_memory_entries")
    .insert({
      entry_type: "owner_note",
      title,
      summary,
      source: "owner",
      importance_score: Math.round(importance),
      occurred_at: occurredAt,
      created_by: ownerId,
      metadata: {
        dedupe_key: dedupeKey,
        manual: true,
      },
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const entry = mapMemoryRow(data as Record<string, unknown>);

  await logNexusActivity({
    actorId: ownerId,
    actorType: "owner",
    action: "nexus.memory.owner_note.created",
    targetType: "nexus_memory_entry",
    targetId: entry.id,
    details: { title: entry.title },
  });

  return { ok: true, entry };
}

export async function updateOwnerNote(
  supabase: SupabaseClient,
  ownerId: string,
  entryId: string,
  input: UpdateOwnerNoteInput,
): Promise<{ ok: true; entry: MemoryEntryDbRow } | { ok: false; error: string }> {
  const { data: existing, error: loadError } = await supabase
    .from("nexus_memory_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();

  if (loadError) {
    return { ok: false, error: loadError.message };
  }

  if (!existing) {
    return { ok: false, error: "Memory entry not found" };
  }

  if (existing.entry_type !== "owner_note") {
    return { ok: false, error: "Only owner notes can be edited" };
  }

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "title cannot be empty" };
    patch.title = title;
  }
  if (input.summary !== undefined) {
    const summary = input.summary.trim();
    if (!summary) return { ok: false, error: "summary cannot be empty" };
    patch.summary = summary;
  }
  if (input.importance_score !== undefined) {
    if (input.importance_score < 1 || input.importance_score > 10) {
      return { ok: false, error: "importance_score must be between 1 and 10" };
    }
    patch.importance_score = Math.round(input.importance_score);
  }
  if (input.occurred_at !== undefined) {
    patch.occurred_at = input.occurred_at;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true, entry: mapMemoryRow(existing as Record<string, unknown>) };
  }

  const { data, error } = await supabase
    .from("nexus_memory_entries")
    .update(patch)
    .eq("id", entryId)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const entry = mapMemoryRow(data as Record<string, unknown>);

  await logNexusActivity({
    actorId: ownerId,
    actorType: "owner",
    action: "nexus.memory.owner_note.updated",
    targetType: "nexus_memory_entry",
    targetId: entry.id,
  });

  return { ok: true, entry };
}

export async function getMemoryEntryById(
  supabase: SupabaseClient,
  entryId: string,
): Promise<{ ok: true; entry: MemoryEntryDbRow } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("nexus_memory_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Memory entry not found" };
  }

  return { ok: true, entry: mapMemoryRow(data as Record<string, unknown>) };
}
