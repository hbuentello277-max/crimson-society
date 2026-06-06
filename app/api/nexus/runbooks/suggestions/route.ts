import { NextResponse } from "next/server";
import { getActiveRunbooks } from "@/lib/runbooks/summary";
import { suggestRunbooks } from "@/lib/runbooks/suggestions";
import { requireOwnerSession } from "@/lib/nexus/auth";
import {
  checkOwnerApiReadRateLimit,
  ownerRateLimitResponse,
} from "@/lib/nexus/rate-limit";
import type { RunbookSuggestionContext } from "@/lib/runbooks/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SOURCES = new Set(["alert", "incident", "observation", "war_room"]);

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
  const source = url.searchParams.get("source") ?? "alert";
  if (!SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  const context: RunbookSuggestionContext = {
    source: source as RunbookSuggestionContext["source"],
    category: url.searchParams.get("category"),
    severity: url.searchParams.get("severity"),
    rule_id: url.searchParams.get("rule_id"),
    integration_slug: url.searchParams.get("integration_slug"),
    workflow_slug: url.searchParams.get("workflow_slug"),
    title: url.searchParams.get("title"),
  };

  try {
    const runbooks = await getActiveRunbooks(session.supabase);
    const suggestions = suggestRunbooks(runbooks, context);

    return NextResponse.json({
      ok: true,
      collected_at: new Date().toISOString(),
      suggestions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load runbook suggestions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
