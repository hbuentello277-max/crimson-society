import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateOwnerAlertStatus } from "@/lib/alerts/generator";
import {
  appendOwnerNote,
  softDeleteOwnerNote,
  updateOwnerNote,
  validateNoteBody,
} from "@/lib/alerts/notes";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import type { AlertDbStatus } from "@/lib/alerts/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_STATUSES = new Set<AlertDbStatus>([
  "acknowledged",
  "resolved",
  "suppressed",
]);

type PatchBody = {
  status?: string;
  investigating?: boolean;
  note?: {
    action?: "add" | "update" | "delete";
    id?: string;
    body?: string;
  };
};

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

  if (body.status && !ALLOWED_STATUSES.has(body.status as AlertDbStatus)) {
    return NextResponse.json({ error: "Invalid alert status" }, { status: 400 });
  }

  if (body.note) {
    const noteResult = await applyNoteMutation(session.supabase, id, session.userId, body.note);
    if (!noteResult.ok) {
      return NextResponse.json({ error: noteResult.error }, { status: noteResult.status });
    }

    if (!body.status && body.investigating === undefined) {
      return NextResponse.json({ ok: true, alert_id: id, note: noteResult.note });
    }
  }

  if (body.status || body.investigating !== undefined) {
    const result = await updateOwnerAlertStatus(session.supabase, {
      alertId: id,
      ownerId: session.userId,
      status: body.status as AlertDbStatus | undefined,
      investigating: body.investigating,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      alert_id: result.alertId,
      event_emitted: result.eventEmitted,
    });
  }

  return NextResponse.json({ error: "No supported patch fields provided" }, { status: 400 });
}

async function applyNoteMutation(
  supabase: SupabaseClient,
  alertId: string,
  ownerId: string,
  note: NonNullable<PatchBody["note"]>,
): Promise<
  | { ok: true; note: Record<string, unknown> }
  | { ok: false; error: string; status: number }
> {
  const { data: existing, error: readError } = await supabase
    .from("nexus_alerts")
    .select("id, title, category, metadata")
    .eq("id", alertId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message, status: 500 };
  }

  if (!existing) {
    return { ok: false, error: "Alert not found", status: 404 };
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
      .from("nexus_alerts")
      .update({ metadata: safeProbeDetails({ ...metadata, owner_notes: notes }) })
      .eq("id", alertId);

    if (error) {
      return { ok: false, error: error.message, status: 500 };
    }

    await emitNexusEvent({
      source: "manual",
      category: "infra",
      eventType: "alert.note_added",
      severity: "info",
      title: `Note added to alert`,
      description: existing.title as string,
      payload: { alert_id: alertId, note_id: created.id, author_id: ownerId },
    });

    await logNexusActivity({
      actorId: ownerId,
      actorType: "owner",
      action: "nexus.alert.note_added",
      targetType: "nexus_alert",
      targetId: alertId,
      details: { note_id: created.id },
    });

    return { ok: true, note: created };
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
      .from("nexus_alerts")
      .update({ metadata: safeProbeDetails({ ...metadata, owner_notes: notes }) })
      .eq("id", alertId);

    if (error) {
      return { ok: false, error: error.message, status: 500 };
    }

    return { ok: true, note: updated };
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
      .from("nexus_alerts")
      .update({ metadata: safeProbeDetails({ ...metadata, owner_notes: notes }) })
      .eq("id", alertId);

    if (error) {
      return { ok: false, error: error.message, status: 500 };
    }

    return { ok: true, note: { id: note.id, deleted: true } };
  }

  return { ok: false, error: "Invalid note action", status: 400 };
}
