import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AppProfile = {
  id: string;
  role: string | null;
  status: string | null;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  profile_image_url: string | null;
  bio: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  riding_area: string | null;
  bike_type: string | null;
  riding_style: string | null;
  profile_tags: string[] | null;
  hide_location_from_suggestions: boolean | null;
  hide_from_suggestions: boolean | null;
  quote: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
};

export const PROFILE_SELECT =
  "id, role, status, username, display_name, full_name, avatar_url, profile_image_url, bio, location, city, state, riding_area, bike_type, riding_style, profile_tags, hide_location_from_suggestions, hide_from_suggestions, quote, instagram_url, tiktok_url, youtube_url, website_url";

export function cleanUsername(value: string) {
  const cleaned = value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");

  return cleaned || "member";
}

function profileDefaults(user: User) {
  const metadata = user.user_metadata ?? {};
  const emailPrefix = user.email?.split("@")[0] ?? "member";
  const displayName =
    typeof metadata.full_name === "string" && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : typeof metadata.name === "string" && metadata.name.trim()
        ? metadata.name.trim()
        : emailPrefix;
  const username =
    typeof metadata.username === "string" && metadata.username.trim()
      ? metadata.username
      : emailPrefix;

  return {
    id: user.id,
    display_name: displayName,
    username: cleanUsername(username),
    profile_image_url:
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    bio: null,
    location: null,
    quote: null,
    instagram_url: null,
    tiktok_url: null,
    youtube_url: null,
    website_url: null,
  };
}

export async function ensureUserProfile(user: User): Promise<AppProfile | null> {
  const existing = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (existing.data) return existing.data as AppProfile;

  if (existing.error) {
    console.warn("Unable to fetch profile", existing.error.message);
    return null;
  }

  const inserted = await supabase
    .from("profiles")
    .insert(profileDefaults(user))
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (inserted.data) return inserted.data as AppProfile;

  if (inserted.error?.code === "23505") {
    const retry = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", user.id)
      .maybeSingle();

    return (retry.data as AppProfile | null) ?? null;
  }

  if (inserted.error) {
    console.warn("Unable to create profile", inserted.error.message);
  }

  return null;
}
