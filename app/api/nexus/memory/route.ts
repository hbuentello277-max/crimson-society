import { NextResponse } from "next/server";
import { createOwnerNote } from "@/lib/memory/manager";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import { requireOwnerSession } from "@/lib/nexus/auth";
import { NEXUS_MEMORY_ENTRY_TYPES, type NexusMemoryEntryType } from "@/lib/nexus/constants";
import {
  checkOwnerApiReadRateLimit,
  checkOwnerApiWriteRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import type { CreateOwnerNoteInput } from "@/lib/memory/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TYPE_SET = new Set<string>(NEXUS_MEMORY_ENTRY_TYPES);

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
  const typeParam = url.searchParams.get("type");
  const entryType =
    typeParam && TYPE_SET.has(typeParam) ? (typeParam as NexusMemoryEntryType) : "all";
  const limitParam = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitParam) ? limitParam : 100;

  try {
    const summary = await getNexusMemorySummary(session.supabase, {
      entryType,
      limit,
    });

    return NextResponse.json({
      ok: true,
      collected_at: summary.collected_at,
      counts: summary.counts,
      entries: summary.entries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load memory entries.";
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

  let body: CreateOwnerNoteInput;
  try {
    body = (await request.json()) as CreateOwnerNoteInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await createOwnerNote(session.supabase, session.userId, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, entry: result.entry });
}
