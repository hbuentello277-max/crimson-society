"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

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
  original_bucket?: string | null;
  original_path?: string | null;
  render_bucket?: string | null;
  render_path?: string | null;
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

export const AUDIO_RENDER_BUCKET = "sound-renders";
export const AUDIO_ORIGINAL_BUCKET = "sound-originals";
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

export const CRIMSON_AUDIO_CATEGORIES = [
  "hip hop",
  "dark trap",
  "cinematic",
  "phonk",
  "night ride",
  "chill ride",
  "highway",
  "aggressive",
  "emotional",
  "luxury",
  "ambient",
] as const;

export type SoundCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type PostSoundLink = {
  id: string;
  post_id: string;
  sound_id: string;
  created_at: string;
  sounds: CrimsonSound | null;
};

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
  return sound.preview_url || sound.audio_url || "";
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

export function isAllowedAudioFile(file: File) {
  return ALLOWED_AUDIO_MIME_TYPES.includes(file.type);
}

export function isAudioFileTooLarge(file: File) {
  return file.size > MAX_AUDIO_FILE_SIZE_BYTES;
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes < 1) return "Unknown size";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function loadAudioDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read audio metadata."));
    };
    audio.src = url;
  });
}

export async function playExclusiveSound(
  sound: CrimsonSound,
  onEnded?: () => void,
) {
  const url = getSoundPlaybackUrl(sound);
  if (!url) return false;

  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }

  if (activeSoundId === sound.id && activeAudio) {
    activeSoundId = null;
    activeAudio = null;
    return false;
  }

  const audio = new Audio(url);
  audio.preload = "none";
  activeAudio = audio;
  activeSoundId = sound.id;

  audio.addEventListener("ended", () => {
    if (activeSoundId === sound.id) {
      activeSoundId = null;
      activeAudio = null;
      onEnded?.();
    }
  });

  await audio.play();
  return true;
}

export function stopCrimsonSound() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  activeAudio = null;
  activeSoundId = null;
}

export async function fetchApprovedSounds(supabase: SupabaseClient) {
  return supabase
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
      original_bucket,
      original_path,
      render_bucket,
      render_path,
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
    .order("featured", { ascending: false })
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function fetchMyFavoriteSoundIds(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("sound_favorites")
    .select("sound_id")
    .eq("user_id", userId);

  if (error) return new Set<string>();
  return new Set((data || []).map((item) => item.sound_id as string));
}
