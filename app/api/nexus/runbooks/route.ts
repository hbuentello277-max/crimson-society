import { NextResponse } from "next/server";
import { createRunbook } from "@/lib/runbooks/manager";
import { getNexusRunbooksSummary } from "@/lib/runbooks/summary";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  NEXUS_RUNBOOK_CATEGORIES,
  type NexusRunbookCategory,
} from "@/lib/nexus/constants";
import {
  checkOwnerApiReadRateLimit,
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import type { CreateRunbookInput } from "@/lib/runbooks/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORY_SET = new Set<string>(NEXUS_RUNBOOK_CATEGORIES);

export async function GET(request: Request) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiReadRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const url = new URL(request.url);
  const categoryParam = url.searchParams.get("category");
  const category =
    categoryParam && CATEGORY_SET.has(categoryParam)
      ? (categoryParam as NexusRunbookCategory)
      : undefined;

  try {
    const summary = await getNexusRunbooksSummary(session.supabase, {
      category: category ?? "all",
    });

    return NextResponse.json({
      ok: true,
      collected_at: summary.collected_at,
      counts: summary.counts,
      runbooks: summary.runbooks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load runbooks.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireOwnerSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { session } = auth;
  const rateLimit = checkOwnerApiWriteRateLimit(session.userId);
  if (!rateLimit.allowed) {
    return ownerRateLimitResponse(rateLimit.retryAfterSeconds);
  }

  let body: CreateRunbookInput;
  try {
    body = (await request.json()) as CreateRunbookInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }

  if (!body.category || !CATEGORY_SET.has(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const result = await createRunbook(session.supabase, body, session.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, runbook: result.runbook });
}
