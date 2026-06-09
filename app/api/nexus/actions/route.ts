import { NextResponse } from "next/server";
import { NEXUS_ACTION_CATEGORIES, NEXUS_ACTION_STATUSES } from "@/lib/action-center/constants";
import { createNexusActionCard } from "@/lib/action-center/manager";
import { requireNexusActionOwner, requireNexusActionReader } from "@/lib/action-center/permissions";
import { getNexusActionQueue } from "@/lib/action-center/summary";
import type { NexusActionCategory, NexusActionStatus, NexusActionType } from "@/lib/action-center/types";
import { NEXUS_ACTION_TYPES } from "@/lib/action-center/constants";
import { checkOwnerApiReadRateLimit, checkOwnerApiWriteRateLimit, ownerRateLimitResponse } from "@/lib/nexus/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_SET = new Set<string>(NEXUS_ACTION_STATUSES);
const CATEGORY_SET = new Set<string>(NEXUS_ACTION_CATEGORIES);
const TYPE_SET = new Set<string>(NEXUS_ACTION_TYPES);

export async function GET(request: Request) {
  const auth = await requireNexusActionReader();
  if ("error" in auth) {
    return auth.error;
  }

  const rateLimit = checkOwnerApiReadRateLimit(auth.session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const categoryParam = url.searchParams.get("category");
  const limitParam = Number(url.searchParams.get("limit") ?? "100");

  const status =
    statusParam && STATUS_SET.has(statusParam) ? (statusParam as NexusActionStatus | "all") : "all";
  const category =
    categoryParam && CATEGORY_SET.has(categoryParam)
      ? (categoryParam as NexusActionCategory | "all")
      : "all";
  const limit = Number.isFinite(limitParam) ? limitParam : 100;

  try {
    const summary = await getNexusActionQueue(auth.session.supabase, {
      access: auth.session.access,
      status,
      category,
      limit,
    });

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load action queue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireNexusActionOwner();
  if ("error" in auth) {
    return auth.error;
  }

  const rateLimit = checkOwnerApiWriteRateLimit(auth.session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  let body: { actionType?: string; transcript?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const actionType = body.actionType?.trim();
  if (!actionType || !TYPE_SET.has(actionType)) {
    return NextResponse.json({ error: "Valid actionType is required." }, { status: 400 });
  }

  const result = await createNexusActionCard(auth.session.supabase, {
    ownerId: auth.session.userId,
    actionType: actionType as NexusActionType,
    transcript: body.transcript,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, action: result.action });
}
