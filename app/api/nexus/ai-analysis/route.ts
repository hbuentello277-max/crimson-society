import { NextResponse } from "next/server";
import { normalizeAnalysisQuestion } from "@/lib/ai-analysis/prompts";
import {
  getNexusAiConfigStatus,
  probeOpenAiConnection,
  runNexusAiAnalysis,
} from "@/lib/ai-analysis/response";
import { nexusOk, ownerAiRoute, ownerReadRouteWithRequest } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRouteWithRequest(async ({ request }) => {
  const config = getNexusAiConfigStatus();
  const probeRequested = new URL(request.url).searchParams.get("probe") === "1";

  if (!probeRequested) {
    return nexusOk({
      configured: config.configured,
      api_key_detected: config.api_key_detected,
      model: config.model,
      model_source: config.model_source,
    });
  }

  const probe = await probeOpenAiConnection();

  return NextResponse.json(
    {
      ok: probe.ok,
      probe: true,
      configured: probe.configured,
      api_key_detected: probe.api_key_detected,
      model: probe.model,
      model_source: probe.model_source,
      latency_ms: probe.latency_ms,
      openai_connection: probe.ok ? "connected" : "failed",
      error: probe.error,
      error_code: probe.error_code,
    },
    { status: probe.ok ? 200 : 503 },
  );
});

export const POST = ownerAiRoute(async ({ supabase, userId }, request) => {
  const body = (await request.json().catch(() => null)) as { question?: unknown } | null;
  const question = typeof body?.question === "string" ? normalizeAnalysisQuestion(body.question) : "";

  if (!question) {
    return NextResponse.json({ error: "question is required." }, { status: 400 });
  }

  if (question.length > 500) {
    return NextResponse.json({ error: "question must be 500 characters or fewer." }, { status: 400 });
  }

  const result = await runNexusAiAnalysis(supabase, userId, question);

  return nexusOk({
    analysis: result.analysis,
    confidence: result.confidence,
    sources: result.sources,
    related_routes: result.related_routes,
    audit_logged: result.audit_logged,
  });
}, "Failed to run Nexus AI analysis.");
