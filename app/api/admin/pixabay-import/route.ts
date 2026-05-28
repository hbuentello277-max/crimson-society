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

  const body = await request.json();
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
  } = body || {};

  if (!title || !previewUrl || !pageUrl) {
    return NextResponse.json(
      { error: "Missing required import fields" },
      { status: 400 },
    );
  }

  const service = createClient(supabaseUrl, serviceRoleKey);

  const existing = await service
    .from("sounds")
    .select("id")
    .eq("source_url", pageUrl)
    .maybeSingle();

  if (existing.data?.id) {
    return NextResponse.json({ soundId: existing.data.id, reused: true });
  }

  const inserted = await service
    .from("sounds")
    .insert({
      title,
      artist: artist || null,
      duration_seconds: durationSeconds || null,
      mood: mood || null,
      bpm: bpm || null,
      category_id: categoryId || null,
      audio_url: previewUrl,
      preview_url: previewUrl,
      cover_image_url: coverImageUrl || null,
      uploaded_by: user.id,
      provider: "pixabay",
      source_url: pageUrl,
      license_type: "Pixabay Content License",
      approved_source: true,
      rights_owner: artist || "Pixabay contributor",
      copyright_status: "verified",
      moderation_status: "approved",
      disabled_at: null,
      import_source_name: pixabayId ? `Pixabay:${pixabayId}` : "Pixabay",
      approved: true,
      featured: false,
    })
    .select("id")
    .single();

  if (inserted.error) {
    return NextResponse.json({ error: inserted.error.message }, { status: 400 });
  }

  await service.from("audio_tracks").upsert(
    {
      sound_id: inserted.data.id,
      title,
      artist: artist || null,
      duration_seconds: durationSeconds || null,
      category_id: categoryId || null,
      mood: mood || null,
      bpm: bpm || null,
      public_stream_url: previewUrl,
      preview_url: previewUrl,
      cover_image_url: coverImageUrl || null,
      provider: "pixabay",
      source_url: pageUrl,
      approved_source: true,
      approved: true,
      moderation_status: "approved",
      copyright_status: "verified",
      license_type: "Pixabay Content License",
      rights_owner: artist || "Pixabay contributor",
    },
    { onConflict: "sound_id" },
  );

  return NextResponse.json({ soundId: inserted.data.id, reused: false });
}