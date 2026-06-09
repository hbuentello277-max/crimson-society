import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { runNexusVoiceAssistant } from "@/lib/admin/nexus-voice/assistant";
import type { NexusVoiceSessionContext } from "@/lib/admin/nexus-voice/conversation";
import { isNexusVoiceAiConfigured, NEXUS_VOICE_NOT_CONFIGURED_MESSAGE } from "@/lib/admin/nexus-voice/config";
import {
  NexusVoiceTranscriptionError,
  transcribeNexusVoiceAudio,
} from "@/lib/admin/nexus-voice/transcribe";

export const runtime = "nodejs";

function parseSessionContext(value: unknown): NexusVoiceSessionContext | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.lastTranscript !== "string" || typeof record.lastResponse !== "string") {
    return null;
  }

  return {
    lastTranscript: record.lastTranscript,
    lastResponse: record.lastResponse,
    lastTool: typeof record.lastTool === "string" ? record.lastTool : null,
    lastNavigation:
      record.lastNavigation &&
      typeof record.lastNavigation === "object" &&
      typeof (record.lastNavigation as { href?: string }).href === "string" &&
      typeof (record.lastNavigation as { label?: string }).label === "string"
        ? {
            href: (record.lastNavigation as { href: string }).href,
            label: (record.lastNavigation as { label: string }).label,
          }
        : null,
    lastFounderRecommendation:
      typeof record.lastFounderRecommendation === "string"
        ? record.lastFounderRecommendation
        : null,
    lastBlocker: typeof record.lastBlocker === "string" ? record.lastBlocker : null,
    lastActionItem: typeof record.lastActionItem === "string" ? record.lastActionItem : null,
  };
}

async function readTranscriptFromRequest(request: Request): Promise<{
  transcript?: string;
  hadAudio: boolean;
  audioMimeType?: string;
  sessionContext?: unknown;
}> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    let body: { transcript?: string; sessionContext?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new Error("Invalid JSON body.");
    }

    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    return { transcript, hadAudio: false, sessionContext: body.sessionContext };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const transcriptField = formData.get("transcript");
    const audio = formData.get("audio");
    const sessionContextField = formData.get("sessionContext");
    let sessionContext: unknown;
    if (typeof sessionContextField === "string") {
      try {
        sessionContext = JSON.parse(sessionContextField);
      } catch {
        sessionContext = undefined;
      }
    }

    if (typeof transcriptField === "string" && transcriptField.trim()) {
      return { transcript: transcriptField.trim(), hadAudio: false, sessionContext };
    }

    if (audio instanceof File && audio.size > 0) {
      const buffer = Buffer.from(await audio.arrayBuffer());
      const mimeType = audio.type || "audio/webm";
      const transcript = await transcribeNexusVoiceAudio(buffer, mimeType);
      return { transcript, hadAudio: true, audioMimeType: mimeType, sessionContext };
    }

    return { hadAudio: Boolean(audio), sessionContext };
  }

  throw new Error("Unsupported content type. Send JSON or multipart form data.");
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { transcript, hadAudio, sessionContext } = await readTranscriptFromRequest(request);

    if (!transcript) {
      if (hadAudio && !isNexusVoiceAiConfigured()) {
        return NextResponse.json(
          {
            error: NEXUS_VOICE_NOT_CONFIGURED_MESSAGE,
            configured: false,
          },
          { status: 503 },
        );
      }

      return NextResponse.json({ error: "No voice input received." }, { status: 400 });
    }

    const admin = createAdminServiceClient();
    const result = await runNexusVoiceAssistant(transcript, admin, auth.session.userId, {
      isPlatformOwner: auth.session.isPlatformOwner,
      sessionContext: parseSessionContext(sessionContext),
    });

    return NextResponse.json({
      ...result,
      configured: isNexusVoiceAiConfigured(),
    });
  } catch (error) {
    if (error instanceof NexusVoiceTranscriptionError) {
      const status =
        error.code === "not_configured"
          ? 503
          : error.code === "quota_exceeded"
            ? 503
            : 400;
      return NextResponse.json(
        {
          error: error.message,
          configured: error.code !== "not_configured",
          transcriptionUnavailable: error.code === "quota_exceeded",
        },
        { status },
      );
    }

    console.error("[nexus-voice] request failed", error);
    return NextResponse.json(
      { error: "NEXUS voice request failed. Try again or type a command." },
      { status: 500 },
    );
  }
}
