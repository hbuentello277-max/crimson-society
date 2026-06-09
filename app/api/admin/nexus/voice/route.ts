import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { runNexusVoiceAssistant } from "@/lib/admin/nexus-voice/assistant";
import { isNexusVoiceAiConfigured, NEXUS_VOICE_NOT_CONFIGURED_MESSAGE } from "@/lib/admin/nexus-voice/config";
import {
  NexusVoiceTranscriptionError,
  transcribeNexusVoiceAudio,
} from "@/lib/admin/nexus-voice/transcribe";

export const runtime = "nodejs";

async function readTranscriptFromRequest(request: Request): Promise<{
  transcript?: string;
  hadAudio: boolean;
  audioMimeType?: string;
}> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    let body: { transcript?: string };
    try {
      body = await request.json();
    } catch {
      throw new Error("Invalid JSON body.");
    }

    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    return { transcript, hadAudio: false };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const transcriptField = formData.get("transcript");
    const audio = formData.get("audio");

    if (typeof transcriptField === "string" && transcriptField.trim()) {
      return { transcript: transcriptField.trim(), hadAudio: false };
    }

    if (audio instanceof File && audio.size > 0) {
      const buffer = Buffer.from(await audio.arrayBuffer());
      const mimeType = audio.type || "audio/webm";
      const transcript = await transcribeNexusVoiceAudio(buffer, mimeType);
      return { transcript, hadAudio: true, audioMimeType: mimeType };
    }

    return { hadAudio: Boolean(audio) };
  }

  throw new Error("Unsupported content type. Send JSON or multipart form data.");
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { transcript, hadAudio } = await readTranscriptFromRequest(request);

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
    const result = await runNexusVoiceAssistant(transcript, admin);

    return NextResponse.json({
      ...result,
      configured: isNexusVoiceAiConfigured(),
    });
  } catch (error) {
    if (error instanceof NexusVoiceTranscriptionError) {
      const status = error.code === "not_configured" ? 503 : 400;
      return NextResponse.json(
        {
          error: error.message,
          configured: error.code !== "not_configured",
        },
        { status },
      );
    }

    const message = error instanceof Error ? error.message : "NEXUS voice request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
