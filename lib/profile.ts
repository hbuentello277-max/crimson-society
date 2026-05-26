import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AppProfile = {
  id: string;
  role: string | null;
  status: string | null;
  is_admin: boolean | null;
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

export type ProfileIdentityInput = {
  display_name: string;
  username: string;
  bio: string;
  location: string;
  quote: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  website_url: string;
};

export type ProfileSaveOperation = "select" | "update" | "upsert" | "avatar-update" | "avatar-upsert";

export type ProfileSaveErrorDetails = {
  operation: ProfileSaveOperation;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export class ProfileSaveError extends Error {
  operation: ProfileSaveOperation;
  code?: string;
  details?: string;
  hint?: string;

  constructor(operation: ProfileSaveOperation, error: unknown) {
    const supabaseError = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    super(supabaseError?.message || `Profile ${operation} failed.`);
    this.name = "ProfileSaveError";
    this.operation = operation;
    this.code = supabaseError?.code;
    this.details = supabaseError?.details;
    this.hint = supabaseError?.hint;
  }

  toDetails(): ProfileSaveErrorDetails {
    return {
      operation: this.operation,
      message: this.message,
      code: this.code,
      details: this.details,
      hint: this.hint,
    };
  }
}

export function getProfileSaveErrorDetails(error: unknown): ProfileSaveErrorDetails {
  if (error instanceof ProfileSaveError) return error.toDetails();
  if (error instanceof Error) return { operation: "update", message: error.message };
  return { operation: "update", message: "Unknown profile save error." };
}

export const PROFILE_SELECT =
  "id, role, status, is_admin, username, display_name, full_name, avatar_url, profile_image_url, bio, location, city, state, riding_area, bike_type, riding_style, profile_tags, hide_location_from_suggestions, hide_from_suggestions, quote, instagram_url, tiktok_url, youtube_url, website_url";

export function cleanUsername(value: string) {
  const cleaned = value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");

  return cleaned || "member";
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function splitLocation(value: string) {
  const [cityPart, statePart] = value.split(",").map((item) => item.trim());

  return {
    city: cityPart || null,
    state: statePart || null,
  };
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
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  return {
    id: user.id,
    display_name: displayName,
    full_name: displayName,
    username: cleanUsername(username),
    avatar_url: avatarUrl,
    profile_image_url: avatarUrl,
    bio: null,
    location: null,
    city: null,
    state: null,
    riding_area: null,
    bike_type: null,
    riding_style: null,
    profile_tags: [],
    hide_location_from_suggestions: false,
    hide_from_suggestions: false,
    quote: null,
    instagram_url: null,
    tiktok_url: null,
    youtube_url: null,
    website_url: null,
  };
}

export async function fetchProfile(userId: string): Promise<AppProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as AppProfile | null) ?? null;
}

export async function ensureUserProfile(user: User): Promise<AppProfile | null> {
  const existing = await fetchProfile(user.id).catch((error) => {
    console.warn("Unable to fetch profile", error.message);
    return null;
  });

  if (existing) return existing;

  const inserted = await supabase
    .from("profiles")
    .insert(profileDefaults(user))
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (inserted.data) return inserted.data as AppProfile;

  if (inserted.error?.code === "23505") {
    return fetchProfile(user.id);
  }

  if (inserted.error) {
    console.warn("Unable to create profile", inserted.error.message);
  }

  return null;
}

export async function updateProfileIdentity(
  userId: string,
  input: ProfileIdentityInput,
): Promise<AppProfile> {
  const location = input.location.trim();
  const { city, state } = splitLocation(location);
  const displayName = input.display_name.trim();

  const payload = {
    display_name: displayName,
    full_name: displayName,
    username: cleanUsername(input.username),
    bio: input.bio.trim(),
    location,
    city,
    state,
    riding_area: location || null,
    quote: input.quote.trim(),
    instagram_url: normalizeUrl(input.instagram_url),
    tiktok_url: normalizeUrl(input.tiktok_url),
    youtube_url: normalizeUrl(input.youtube_url),
    website_url: normalizeUrl(input.website_url),
  };

  const updated = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (updated.error) throw new ProfileSaveError("update", updated.error);
  if (updated.data) return updated.data as AppProfile;

  const inserted = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        ...payload,
      },
      { onConflict: "id" },
    )
    .select(PROFILE_SELECT)
    .single();

  if (inserted.error) throw new ProfileSaveError("upsert", inserted.error);
  return inserted.data as AppProfile;
}

export async function updateProfileAvatar(
  userId: string,
  profileImageUrl: string,
): Promise<AppProfile> {
  const updated = await supabase
    .from("profiles")
    .update({ profile_image_url: profileImageUrl, avatar_url: profileImageUrl })
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (updated.error) throw new ProfileSaveError("avatar-update", updated.error);
  if (updated.data) return updated.data as AppProfile;

  const inserted = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        profile_image_url: profileImageUrl,
        avatar_url: profileImageUrl,
      },
      { onConflict: "id" },
    )
    .select(PROFILE_SELECT)
    .single();

  if (inserted.error) throw new ProfileSaveError("avatar-upsert", inserted.error);
  return inserted.data as AppProfile;
}

export function profileDisplayName(profile: AppProfile | null) {
  return profile?.display_name?.trim() || profile?.full_name?.trim() || "Crimson Member";
}

export function profileHandle(profile: AppProfile | null) {
  return profile?.username?.trim() ? `@${profile.username.trim().replace(/^@+/, "")}` : "@member";
}

export function profileLocation(profile: AppProfile | null) {
  return (
    profile?.location?.trim() ||
    [profile?.city, profile?.state].filter(Boolean).join(", ") ||
    "Location pending"
  );
}
