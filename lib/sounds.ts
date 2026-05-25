"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CrimsonSound = {
  id: string;
  title: string;
  artist: string | null;
  duration_seconds: number | null;
  mood?: string | null;
  bpm?: number | null;
  cover_image_url: string | null;
  audio_url: string | null;
  preview_url: string | null;
  license_type?: string | null;
  rights_owner?: string | null;
  source_url?: string | null;
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
      duration_seconds,
      mood,
      bpm,
      cover_image_url,
      audio_url,
      preview_url,
      license_type,
      rights_owner,
      source_url,
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
