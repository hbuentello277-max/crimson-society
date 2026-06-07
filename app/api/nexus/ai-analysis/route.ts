import { NextResponse } from "next/server";
import { normalizeAnalysisQuestion } from "@/lib/ai-analysis/prompts";
import { runNexusAiAnalysis } from "@/lib/ai-analysis/response";
import { nexusOk, ownerAiRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  });
}, "Failed to run Nexus AI analysis.");
