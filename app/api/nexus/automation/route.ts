import { NextResponse } from "next/server";
import { getNexusAutomationSummary } from "@/lib/automation/summary";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  NEXUS_AUTOMATION_ACTION_TYPES,
  NEXUS_AUTOMATION_STATUSES,
  type NexusAutomationActionType,
  type NexusAutomationStatus,
} from "@/lib/nexus/constants";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_SET = new Set<string>(NEXUS_AUTOMATION_STATUSES);
const TYPE_SET = new Set<string>(NEXUS_AUTOMATION_ACTION_TYPES);

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
  const statusParam = url.searchParams.get("status");
  const typeParam = url.searchParams.get("type");
  const limitParam = Number(url.searchParams.get("limit") ?? "100");
  const generateParam = url.searchParams.get("generate");

  const status =
    statusParam && STATUS_SET.has(statusParam)
      ? (statusParam as NexusAutomationStatus)
      : "all";
  const actionType =
    typeParam && TYPE_SET.has(typeParam) ? (typeParam as NexusAutomationActionType) : "all";
  const limit = Number.isFinite(limitParam) ? limitParam : 100;
  const generate = generateParam !== "false";

  try {
    const summary = await getNexusAutomationSummary(session.supabase, {
      status,
      actionType,
      limit,
      generate,
    });

    return NextResponse.json({
      ok: true,
      collected_at: summary.collected_at,
      generation: summary.generation,
      counts: summary.counts,
      counts_by_type: summary.counts_by_type,
      actions: summary.actions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load automation actions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
