"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Types
 */

export type SoundCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order?: number | null;
};

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

/**
 * Buckets / constraints
 */

export const AUDIO_ORIGINAL_BUCKET = "sound-originals";
export const AUDIO_RENDER_BUCKET = "sound-renders";

export const MAX_AUDIO_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_AUDIO_DURATION_SECONDS = 180; // 3 minutes

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

/**
 * Pixabay category presets
 */

export const PIXABAY_AUDIO_CATEGORIES: {
  slug: string;
  name: string;
  mood: string;
}[] = [
  { slug: "phonk", name: "Phonk / Drift", mood: "Night Ride" },
  { slug: "trap", name: "Trap / Drill", mood: "Aggressive" },
  { slug: "hip-hop", name: "Hip Hop", mood: "Urban Cruise" },
  { slug: "edm", name: "EDM / Club", mood: "Hype" },
  { slug: "cinematic", name: "Cinematic", mood: "Epic Ride" },
  { slug: "rock", name: "Rock", mood: "Highway" },
  { slug: "lofi", name: "Lo-fi / Chill", mood: "Chill Cruise" },
];

/**
 * Formatting helpers
 */

export function formatSoundDuration(seconds?: number | null) {
  if (!seconds || seconds < 1) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Label / category helpers
 */

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

/**
 * File validation & metadata helpers
 */

export function isAllowedAudioFile(file: File) {
  return ALLOWED_AUDIO_MIME_TYPES.includes(file.type);
}

export function isAudioFileTooLarge(file: File) {
  return file.size > MAX_AUDIO_FILE_SIZE_BYTES;
}

export async function loadAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);

      audio.addEventListener("loadedmetadata", () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration || 0);
      });

      audio.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read audio metadata."));
      });
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error("Could not read audio metadata."),
      );
    }
  });
}

/**
 * Playback control
 */

let activeAudio: HTMLAudioElement | null = null;
let activeSoundId: string | null = null;

export async function playExclusiveSound(
  sound: CrimsonSound,
  onEnded?: () => void,
): Promise<boolean> {
  const src = getSoundPlaybackUrl(sound);
  if (!src) return false;

  // Toggle off if the same sound is already playing
  if (activeSoundId === sound.id && activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
    activeSoundId = null;
    return false;
  }

  // Stop any currently playing audio
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }

  const audio = new Audio(src);
  activeAudio = audio;
  activeSoundId = sound.id;

  audio.addEventListener("ended", () => {
    if (activeAudio === audio) {
      activeAudio = null;
      activeSoundId = null;
    }
    onEnded?.();
  });

  try {
    await audio.play();
    return true;
  } catch {
    activeAudio = null;
    activeSoundId = null;
    return false;
  }
}

export function stopCrimsonSound() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  activeAudio = null;
  activeSoundId = null;
}

/**
 * Fetch helpers
 */

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
      disabled_at,
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

export async function fetchMyFavoriteSoundIds(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabaseClient
    .from("sound_favorites")
    .select("sound_id")
    .eq("user_id", userId);

  if (error || !data) return new Set();
  return new Set(data.map((row) => row.sound_id as string));
}