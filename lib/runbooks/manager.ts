import type { SupabaseClient } from "@supabase/supabase-js";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import type {
  CreateRunbookInput,
  RunbookDbRow,
  RunbookStep,
  UpdateRunbookInput,
} from "@/lib/runbooks/types";

function parseSteps(value: unknown): RunbookStep[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const steps: RunbookStep[] = [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const row = item as Record<string, unknown>;
    const step: RunbookStep = {
      id: typeof row.id === "string" ? row.id : `step-${index + 1}`,
      title: typeof row.title === "string" ? row.title : "Step",
      completed: row.completed === true,
    };

    if (typeof row.description === "string") {
      step.description = row.description;
    }

    steps.push(step);
  }

  return steps;
}

export function mapRunbookRow(row: Record<string, unknown>): RunbookDbRow {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    category: row.category as RunbookDbRow["category"],
    severity: row.severity as RunbookDbRow["severity"],
    description: row.description as string,
    trigger_types: (row.trigger_types as string[]) ?? [],
    checklist: parseSteps(row.checklist),
    resolution_steps: parseSteps(row.resolution_steps),
    verification_steps: parseSteps(row.verification_steps),
    owner_notes: (row.owner_notes as string | null) ?? null,
    status: row.status as RunbookDbRow["status"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function createRunbook(
  supabase: SupabaseClient,
  input: CreateRunbookInput,
  ownerId: string,
): Promise<{ ok: true; runbook: RunbookDbRow } | { ok: false; error: string }> {
  const slug = slugify(input.slug || input.title);
  if (!slug) {
    return { ok: false, error: "Invalid runbook slug" };
  }

  const { data, error } = await supabase
    .from("nexus_runbooks")
    .insert({
      slug,
      title: input.title.trim(),
      category: input.category,
      severity: input.severity,
      description: input.description.trim(),
      trigger_types: input.trigger_types ?? [],
      checklist: input.checklist ?? [],
      resolution_steps: input.resolution_steps ?? [],
      verification_steps: input.verification_steps ?? [],
      owner_notes: input.owner_notes ?? null,
      metadata: safeProbeDetails({ created_by: ownerId }),
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create runbook" };
  }

  await logNexusActivity({
    actorId: ownerId,
    actorType: "owner",
    action: "nexus.runbook.created",
    targetType: "nexus_runbook",
    targetId: data.id as string,
    details: { slug },
  });

  return { ok: true, runbook: mapRunbookRow(data as Record<string, unknown>) };
}

export async function updateRunbook(
  supabase: SupabaseClient,
  runbookId: string,
  input: UpdateRunbookInput,
  ownerId: string,
): Promise<{ ok: true; runbook: RunbookDbRow } | { ok: false; error: string }> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.slug !== undefined) updates.slug = slugify(input.slug);
  if (input.category !== undefined) updates.category = input.category;
  if (input.severity !== undefined) updates.severity = input.severity;
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.trigger_types !== undefined) updates.trigger_types = input.trigger_types;
  if (input.checklist !== undefined) updates.checklist = input.checklist;
  if (input.resolution_steps !== undefined) updates.resolution_steps = input.resolution_steps;
  if (input.verification_steps !== undefined) updates.verification_steps = input.verification_steps;
  if (input.owner_notes !== undefined) updates.owner_notes = input.owner_notes;
  if (input.status !== undefined) updates.status = input.status;

  const { data, error } = await supabase
    .from("nexus_runbooks")
    .update(updates)
    .eq("id", runbookId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Runbook not found" };
  }

  await logNexusActivity({
    actorId: ownerId,
    actorType: "owner",
    action: "nexus.runbook.updated",
    targetType: "nexus_runbook",
    targetId: runbookId,
    details: { fields: Object.keys(updates) },
  });

  return { ok: true, runbook: mapRunbookRow(data as Record<string, unknown>) };
}

export async function deleteRunbook(
  supabase: SupabaseClient,
  runbookId: string,
  ownerId: string,
): Promise<{ ok: true } | { ok: false; error: string; code?: "seed_protected" }> {
  const { data: existing, error: readError } = await supabase
    .from("nexus_runbooks")
    .select("id, slug, metadata")
    .eq("id", runbookId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!existing) {
    return { ok: false, error: "Runbook not found" };
  }

  const metadata = (existing.metadata as Record<string, unknown>) ?? {};
  if (metadata.is_seed === true) {
    return { ok: false, error: "Starter runbooks cannot be deleted. Archive instead.", code: "seed_protected" };
  }

  const { error } = await supabase.from("nexus_runbooks").delete().eq("id", runbookId);
  if (error) {
    return { ok: false, error: error.message };
  }

  await logNexusActivity({
    actorId: ownerId,
    actorType: "owner",
    action: "nexus.runbook.deleted",
    targetType: "nexus_runbook",
    targetId: runbookId,
    details: { slug: existing.slug },
  });

  return { ok: true };
}
