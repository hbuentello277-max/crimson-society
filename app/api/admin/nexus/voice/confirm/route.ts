import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { confirmNexusVoiceAction } from "@/lib/admin/nexus-voice/assistant";
import { verifyNexusVoiceConfirmationToken } from "@/lib/admin/nexus-voice/confirmation";
import { isNexusVoiceAiConfigured } from "@/lib/admin/nexus-voice/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Confirmation token is required." }, { status: 400 });
  }

  const verified = verifyNexusVoiceConfirmationToken(token, auth.session.userId);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  try {
    const admin = createAdminServiceClient();
    const result = await confirmNexusVoiceAction(
      admin,
      auth.session.userId,
      verified.payload.tool,
      verified.payload.draft,
    );

    return NextResponse.json({
      ...result,
      configured: isNexusVoiceAiConfigured(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "NEXUS confirmation failed.";
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
