import { NextResponse } from "next/server";
import { answerNexusChat } from "@/lib/chat/answer-builder";
import { normalizeChatMessage } from "@/lib/chat/prompts";
import { ownerReadRouteWithRequest, nexusOk } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = ownerReadRouteWithRequest(
  async ({ supabase, request }) => {
    const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
    const message = typeof body?.message === "string" ? normalizeChatMessage(body.message) : "";

    if (!message) {
      return NextResponse.json({ error: "message is required." }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ error: "message must be 500 characters or fewer." }, { status: 400 });
    }

    const result = await answerNexusChat(supabase, message);

    return nexusOk({
      answer: result.answer.answer,
      sources: result.answer.sources,
      related_routes: result.answer.related_routes,
      confidence: result.answer.confidence,
      mode: result.mode,
      intent: result.intent,
    });
  },
  "Failed to answer Nexus chat message.",
);
