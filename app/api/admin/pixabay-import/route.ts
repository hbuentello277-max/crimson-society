import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" || profile?.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    pixabayId,
    title,
    artist,
    durationSeconds,
    previewUrl,
    pageUrl,
    coverImageUrl,
    categoryId,
    mood,
    bpm,
  } = body;

  if (!title || !previewUrl || !pageUrl) {
    return NextResponse.json(
      {
        error: "Missing required import fields: title, previewUrl, and pageUrl are all required.",
        received: { title: !!title, previewUrl: !!previewUrl, pageUrl: !!pageUrl },
      },
      { status: 400 },
    );
  }

  const service = createClient(supabaseUrl, serviceRoleKey);

  // Deduplicate by source_url
  const existing = await service
    .from("sounds")
    .select("id")
    .eq("source_url", pageUrl as string)
    .maybeSingle();

  if (existing.error) {
    console.error("[pixabay-import] dedup check failed:", existing.error.message);
  }

  if (existing.data?.id) {
    console.log(`[pixabay-import] reused existing sound id=${existing.data.id} for url=${pageUrl as string}`);
    return NextResponse.json({ soundId: existing.data.id, reused: true });
  }

  const inserted = await service
    .from("sounds")
    .insert({
      title: title as string,
      artist: (artist as string | null) || null,
      duration_seconds: (durationSeconds as number | null) || null,
      mood: (mood as string | null) || null,
      bpm: (bpm as number | null) || null,
      category_id: (categoryId as string | null) || null,
      audio_url: previewUrl as string,
      preview_url: previewUrl as string,
      cover_image_url: (coverImageUrl as string | null) || null,
      uploaded_by: user.id,
      provider: "pixabay",
      source_url: pageUrl as string,
      license_type: "Pixabay Content License",
      approved_source: true,
      rights_owner: (artist as string) || "Pixabay contributor",
      copyright_status: "verified",
      moderation_status: "approved",
      disabled_at: null,
      import_source_name: pixabayId ? `Pixabay:${pixabayId as string | number}` : "Pixabay",
      approved: true,
      featured: false,
    })
    .select("id")
    .single();

  if (inserted.error) {
    console.error("[pixabay-import] insert into sounds failed:", inserted.error.message, inserted.error.details);
    return NextResponse.json(
      { error: `Failed to save track to Supabase: ${inserted.error.message}` },
      { status: 400 },
    );
  }

  console.log(`[pixabay-import] inserted sound id=${inserted.data.id} title="${title as string}"`);

  const upsertResult = await service.from("audio_tracks").upsert(
    {
      sound_id: inserted.data.id,
      title: title as string,
      artist: (artist as string | null) || null,
      duration_seconds: (durationSeconds as number | null) || null,
      category_id: (categoryId as string | null) || null,
      mood: (mood as string | null) || null,
      bpm: (bpm as number | null) || null,
      public_stream_url: previewUrl as string,
      preview_url: previewUrl as string,
      cover_image_url: (coverImageUrl as string | null) || null,
      provider: "pixabay",
      source_url: pageUrl as string,
      approved_source: true,
      approved: true,
      moderation_status: "approved",
      copyright_status: "verified",
      license_type: "Pixabay Content License",
      rights_owner: (artist as string) || "Pixabay contributor",
    },
    { onConflict: "sound_id" },
  );

  if (upsertResult.error) {
    // Non-fatal — sound already inserted; log but don't fail the request
    console.warn(
      "[pixabay-import] audio_tracks upsert warning:",
      upsertResult.error.message,
    );
  }

  return NextResponse.json({ soundId: inserted.data.id, reused: false });
}
