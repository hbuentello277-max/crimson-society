import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  buildDmMediaPath,
  DM_MESSAGE_MEDIA_BUCKET,
  validateDmImageFile,
} from "@/lib/messages/dm-message";
import { isUuid } from "@/lib/messages/direct-conversation";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Image file is required." }, { status: 400 });
  }

  const validationError = validateDmImageFile(file);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const { data: membership, error: membershipError } = await auth.supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ ok: false, error: membershipError.message }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: "You are not a member of this conversation." },
      { status: 403 },
    );
  }

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

  const { data: publicUrlData } = service.storage.from(DM_MESSAGE_MEDIA_BUCKET).getPublicUrl(mediaPath);

  return NextResponse.json({
    ok: true,
    messageId,
    mediaPath,
    mediaUrl: publicUrlData.publicUrl,
    mediaMimeType: file.type,
    mediaSizeBytes: file.size,
    messageType: "image" as const,
  });
}
