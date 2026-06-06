import { NextResponse } from "next/server";
import { getNexusRunbookDetail } from "@/lib/runbooks/detail";
import { deleteRunbook, updateRunbook } from "@/lib/runbooks/manager";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  NEXUS_RUNBOOK_CATEGORIES,
  NEXUS_RUNBOOK_STATUSES,
  type NexusRunbookCategory,
  type NexusRunbookStatus,
} from "@/lib/nexus/constants";
import {
  checkOwnerApiReadRateLimit,
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import type { UpdateRunbookInput } from "@/lib/runbooks/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORY_SET = new Set<string>(NEXUS_RUNBOOK_CATEGORIES);
const STATUS_SET = new Set<string>(NEXUS_RUNBOOK_STATUSES);

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
    const detail = await getNexusRunbookDetail(session.supabase, id);
    if (!detail) {
      return NextResponse.json({ error: "Runbook not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load runbook.";
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

  let body: UpdateRunbookInput;
  try {
    body = (await request.json()) as UpdateRunbookInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.category && !CATEGORY_SET.has(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (body.status && !STATUS_SET.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const result = await updateRunbook(session.supabase, id, body, session.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true, runbook: result.runbook });
}

export async function DELETE(
  _request: Request,
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
  const result = await deleteRunbook(session.supabase, id, session.userId);

  if (!result.ok) {
    const status = result.code === "seed_protected" ? 403 : 404;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({ ok: true });
}
