import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  appendOwnerNote,
  softDeleteOwnerNote,
  updateOwnerNote,
  validateNoteBody,
} from "@/lib/alerts/notes";
import { getNexusObservationDetail } from "@/lib/observations/detail";
import { updateOwnerObservationStatus } from "@/lib/observations/manager";
import type { ObservationDbStatus } from "@/lib/observations/types";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { safeProbeDetails } from "@/lib/monitoring/redact";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_STATUSES = new Set<ObservationDbStatus>(["dismissed", "confirmed"]);

type PatchBody = {
  status?: string;
  note?: {
    action?: "add" | "update" | "delete";
    id?: string;
    body?: string;
  };
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiReadRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const { id } = await context.params;

  try {
    const detail = await getNexusObservationDetail(session.supabase, id);
    if (!detail) {
      return NextResponse.json({ error: "Observation not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, observation: detail });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Nexus observation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiWriteRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const { id } = await context.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.status && !ALLOWED_STATUSES.has(body.status as ObservationDbStatus)) {
    return NextResponse.json({ error: "Invalid observation status" }, { status: 400 });
  }

  if (body.note) {
    const noteResult = await applyObservationNoteMutation(
      session.supabase,
      id,
      session.userId,
      body.note,
    );
    if (!noteResult.ok) {
      return NextResponse.json({ error: noteResult.error }, { status: noteResult.status });
    }

    if (!body.status) {
      return NextResponse.json({
        ok: true,
        observation_id: id,
        note: noteResult.note,
        event_emitted: noteResult.eventEmitted,
      });
    }
  }

  if (body.status) {
    const result = await updateOwnerObservationStatus(session.supabase, {
      observationId: id,
      ownerId: session.userId,
      status: body.status as ObservationDbStatus,
    });

    if (!result.ok) {
      const status = result.error === "Observation not found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      observation_id: result.observationId,
      event_emitted: result.eventEmitted,
    });
  }

  return NextResponse.json({ error: "No supported patch fields provided" }, { status: 400 });
}

async function applyObservationNoteMutation(
  supabase: SupabaseClient,
  observationId: string,
  ownerId: string,
  note: NonNullable<PatchBody["note"]>,
): Promise<
  | { ok: true; note: Record<string, unknown>; eventEmitted: boolean }
  | { ok: false; error: string; status: number }
> {
  const { data: existing, error: readError } = await supabase
    .from("nexus_observations")
    .select("id, title, category, metadata")
    .eq("id", observationId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message, status: 500 };
  }

  if (!existing) {
    return { ok: false, error: "Observation not found", status: 404 };
  }

  const metadata = (existing.metadata as Record<string, unknown>) ?? {};
  const action = note.action ?? "add";

  if (action === "add") {
    const validationError = validateNoteBody(note.body);
    if (validationError) {
      return { ok: false, error: validationError, status: 400 };
    }

    const { notes, note: created } = appendOwnerNote({
      metadata,
      authorId: ownerId,
      body: note.body!,
    });

    const { error } = await supabase
      .from("nexus_observations")
      .update({ metadata: safeProbeDetails({ ...metadata, owner_notes: notes }) })
      .eq("id", observationId);

    if (error) {
      return { ok: false, error: error.message, status: 500 };
    }

    const event = await emitNexusEvent({
      source: "manual",
      category: mapCategoryToEventCategory(existing.category as string),
      eventType: "observation.note_added",
      severity: "info",
      title: "Note added to observation",
      description: existing.title as string,
      payload: {
        observation_id: observationId,
        note_id: created.id,
        author_id: ownerId,
      },
    });

    await logNexusActivity({
      actorId: ownerId,
      actorType: "owner",
      action: "nexus.observation.note_added",
      targetType: "nexus_observation",
      targetId: observationId,
      details: { note_id: created.id },
    });

    return { ok: true, note: created, eventEmitted: event.ok };
  }

  if (action === "update") {
    if (!note.id) {
      return { ok: false, error: "note.id is required for update", status: 400 };
    }

    const validationError = validateNoteBody(note.body);
    if (validationError) {
      return { ok: false, error: validationError, status: 400 };
    }

    const { notes, note: updated } = updateOwnerNote({
      metadata,
      noteId: note.id,
      body: note.body!,
    });

    if (!updated) {
      return { ok: false, error: "Note not found", status: 404 };
    }

    const { error } = await supabase
      .from("nexus_observations")
      .update({ metadata: safeProbeDetails({ ...metadata, owner_notes: notes }) })
      .eq("id", observationId);

    if (error) {
      return { ok: false, error: error.message, status: 500 };
    }

    return { ok: true, note: updated, eventEmitted: false };
  }

  if (action === "delete") {
    if (!note.id) {
      return { ok: false, error: "note.id is required for delete", status: 400 };
    }

    const { notes, deleted } = softDeleteOwnerNote({ metadata, noteId: note.id });
    if (!deleted) {
      return { ok: false, error: "Note not found", status: 404 };
    }

    const { error } = await supabase
      .from("nexus_observations")
      .update({ metadata: safeProbeDetails({ ...metadata, owner_notes: notes }) })
      .eq("id", observationId);

    if (error) {
      return { ok: false, error: error.message, status: 500 };
    }

    return { ok: true, note: { id: note.id, deleted: true }, eventEmitted: false };
  }

  return { ok: false, error: "Invalid note action", status: 400 };
}

function mapCategoryToEventCategory(
  category: string,
): "health" | "deployment" | "revenue" | "growth" | "security" | "commerce" | "infra" | "mission" | "recovery" {
  if (
    category === "health" ||
    category === "deployment" ||
    category === "revenue" ||
    category === "growth" ||
    category === "security" ||
    category === "commerce" ||
    category === "infra" ||
    category === "mission" ||
    category === "recovery"
  ) {
    return category;
  }

  return "infra";
}
