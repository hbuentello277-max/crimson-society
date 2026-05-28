"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type CrimsonSound = {
  id: string;
  title: string;
  artist: string | null;
  description?: string | null;
  duration_seconds: number | null;
  mood?: string | null;
  bpm?: number | null;
  cover_image_url: string | null;
  audio_url: string | null;
  preview_url: string | null;
  provider?: string | null;
  license_type?: string | null;
  license_notes?: string | null;
  rights_owner?: string | null;
  source_url?: string | null;
  approved_source?: boolean | null;
  copyright_status?: string | null;
  moderation_status?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  original_bucket?: string | null;
  original_path?: string | null;
  render_bucket?: string | null;
  render_path?: string | null;
  import_source_name?: string | null;
  approved: boolean;
  featured: boolean;
  usage_count: number;
  category_id: string | null;
  disabled_at?: string | null;
  created_at: string | null;
  sound_categories?:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
};

export const AUDIO_ORIGINAL_BUCKET = "sound-originals";
export const AUDIO_RENDER_BUCKET = "sound-renders";
export const MAX_AUDIO_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_AUDIO_DURATION_SECONDS = 180;
export const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
];

let activeAudio: HTMLAudioElement | null = null;
let activeSoundId: string | null = null;

export function formatSoundDuration(seconds?: number | null) {
  if (!seconds || seconds < 1) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getSoundPlaybackUrl(sound: CrimsonSound | null | undefined) {
  if (!sound) return "";
  if (sound.preview_url) return sound.preview_url;
  if (sound.audio_url) return sound.audio_url;

  if (sound.render_bucket === AUDIO_RENDER_BUCKET && sound.render_path) {
    const { data } = supabase.storage
      .from(AUDIO_RENDER_BUCKET)
      .getPublicUrl(sound.render_path);
    return data.publicUrl || "";
  }

  return "";
}

export function getSoundLabel(sound: CrimsonSound | null | undefined) {
  if (!sound) return "";
  return sound.artist ? `${sound.artist} - ${sound.title}` : sound.title;
}

export function getSoundCategoryName(sound: CrimsonSound | null | undefined) {
  const category = sound?.sound_categories;
  if (Array.isArray(category)) return category[0]?.name ?? "";
  return category?.name ?? "";
}

export async function fetchApprovedSounds(supabaseClient: SupabaseClient) {
  return supabaseClient
    .from("sounds")
    .select(
      `
      id,
      title,
      artist,
      description,
      duration_seconds,
      mood,
      bpm,
      cover_image_url,
      audio_url,
      preview_url,
      provider,
      license_type,
      license_notes,
      rights_owner,
      source_url,
      approved_source,
      copyright_status,
      moderation_status,
      file_size_bytes,
      mime_type,
      original_bucket,
      original_path,
      render_bucket,
      render_path,
      import_source_name,
      approved,
      featured,
      usage_count,
      category_id,
      created_at,
      sound_categories (
        id,
        name,
        slug
      )
    `,
    )
    .eq("approved", true)
    .is("disabled_at", null)
    .or("preview_url.not.is.null,audio_url.not.is.null,render_path.not.is.null")
    .order("featured", { ascending: false })
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false });
}