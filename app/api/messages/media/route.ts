import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  buildDmMediaPath,
  DM_MESSAGE_MEDIA_BUCKET,
  isDmAudioMime,
  isDmImageMime,
  validateDmAudioFile,
  validateDmImageFile,
} from "@/lib/messages/dm-message";
import { DM_VOICE_MAX_SECONDS } from "@/lib/messages/voice-recorder";
import { isUuid } from "@/lib/messages/direct-conversation";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

const SIGNED_URL_TTL_SECONDS = 60 * 15;

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseDurationSeconds(raw: FormDataEntryValue | null) {
  if (raw == null || raw === "") return null;
  const value = Number(String(raw));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.min(Math.round(value), DM_VOICE_MAX_SECONDS);
}

function pathBelongsToConversation(path: string, conversationId: string) {
  return path === conversationId || path.startsWith(`${conversationId}/`);
}

async function assertCanAccessConversationMedia(
  request: Request,
  conversationId: string,
) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: auth.error }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("status")
    .eq("id", auth.userId)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: profileError.message }, { status: 500 }),
    };
  }

  if (!profile || profile.status !== "active") {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Account is restricted." }, { status: 403 }),
    };
  }

  const { data: membership, error: membershipError } = await auth.supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (membershipError) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: membershipError.message }, { status: 500 }),
    };
  }

  if (!membership) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "You are not a member of this conversation." },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, auth };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId")?.trim() ?? "";
  const path = searchParams.get("path")?.trim() ?? "";

  if (!isUuid(conversationId) || !path || !pathBelongsToConversation(path, conversationId)) {
    return NextResponse.json({ ok: false, error: "Invalid media request." }, { status: 400 });
  }

  const access = await assertCanAccessConversationMedia(request, conversationId);
  if (!access.ok) return access.response;

  const service = getServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, error: "Media access is not configured on the server." },
      { status: 503 },
    );
  }

  const { data, error } = await service.storage
    .from(DM_MESSAGE_MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Could not sign media URL." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, mediaUrl: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const conversationId = String(formData.get("conversationId") || "").trim();
  const file = formData.get("file");

  if (!isUuid(conversationId)) {
    return NextResponse.json({ ok: false, error: "Invalid conversation." }, { status: 400 });
  }

  const access = await assertCanAccessConversationMedia(request, conversationId);
  if (!access.ok) return access.response;

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Media file is required." }, { status: 400 });
  }

  const mime = file.type?.trim().toLowerCase() || "";
  const isImage = isDmImageMime(mime);
  const isAudio = isDmAudioMime(mime);

  if (!isImage && !isAudio) {
    return NextResponse.json(
      { ok: false, error: "Unsupported file type. Send an image or voice message." },
      { status: 400 },
    );
  }

  const validationError = isImage ? validateDmImageFile(file) : validateDmAudioFile(file);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const mediaDurationSeconds = isAudio ? parseDurationSeconds(formData.get("durationSeconds")) : null;

  const service = getServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, error: "Media upload is not configured on the server." },
      { status: 503 },
    );
  }

  const messageId = crypto.randomUUID();
  const mediaPath = buildDmMediaPath(conversationId, messageId, file.type);

  const { error: uploadError } = await service.storage
    .from(DM_MESSAGE_MEDIA_BUCKET)
    .upload(mediaPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
  }

  const { data: signedUrlData, error: signError } = await service.storage
    .from(DM_MESSAGE_MEDIA_BUCKET)
    .createSignedUrl(mediaPath, SIGNED_URL_TTL_SECONDS);

  if (signError || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: signError?.message || "Could not sign media URL." },
      { status: 500 },
    );
  }

  const messageType = isAudio ? ("audio" as const) : ("image" as const);

  return NextResponse.json({
    ok: true,
    messageId,
    mediaPath,
    mediaUrl: signedUrlData.signedUrl,
    mediaMimeType: file.type,
    mediaSizeBytes: file.size,
    mediaDurationSeconds,
    messageType,
  });
}
