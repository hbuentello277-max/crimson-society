import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { normalizeLanguage, type SupportedLanguage } from "@/lib/i18n/language";

export type AppProfile = {
  id: string;
  role: string | null;
  status: string | null;
  is_admin: boolean | null;
  is_platform_owner?: boolean | null;
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
  is_premium?: boolean | null;
  premium_tier?: string | null;
  premium_expires_at?: string | null;
  is_founder_blackcard?: boolean | null;
  founder_blackcard_granted_at?: string | null;
  is_founding_blackcard?: boolean | null;
  founding_blackcard_granted_at?: string | null;
  membership_tier?: string | null;
  blackcard_public?: boolean | null;
  referral_code?: string | null;
  referred_by_user_id?: string | null;
  preferred_language?: SupportedLanguage | null;
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

export type ProfilePrivacyInput = {
  hide_from_suggestions: boolean;
  hide_location_from_suggestions: boolean;
};

export type ProfileLanguageInput = {
  preferred_language: SupportedLanguage;
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
  "id, role, status, is_admin, is_platform_owner, username, display_name, full_name, avatar_url, profile_image_url, bio, location, city, state, riding_area, bike_type, riding_style, profile_tags, hide_location_from_suggestions, hide_from_suggestions, quote, instagram_url, tiktok_url, youtube_url, website_url, is_premium, premium_tier, premium_expires_at, is_founder_blackcard, founder_blackcard_granted_at, is_founding_blackcard, founding_blackcard_granted_at, membership_tier, blackcard_public, referral_code, referred_by_user_id, preferred_language";

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

/**
 * Returns true only if the profile has both a username and a display_name.
 * Used to gate access to the main app until profile setup is complete.
 * Does NOT treat existing users differently — it simply checks the fields.
 */
export function isProfileSetupComplete(
  profile: {
    username?: string | null;
    display_name?: string | null;
  } | null | undefined,
): boolean {
  const hasUsername = Boolean(profile?.username?.trim());
  const hasDisplayName = Boolean(profile?.display_name?.trim());
  return hasUsername && hasDisplayName;
}

/**
 * UI-only display name fallback. Never saved to DB.
 */
export function profileDisplayName(profile: AppProfile | null) {
  return profile?.display_name?.trim() || profile?.full_name?.trim() || "Crimson Member";
}

export function profileHandle(profile: AppProfile | null) {
  const username = profile?.username?.trim();

  return username ? `@${username}` : "@crimson-member";
}

export function profileLocation(profile: AppProfile | null) {
  const directLocation = profile?.location?.trim();

  if (directLocation) return directLocation;

  const parts = [
    profile?.city?.trim(),
    profile?.state?.trim(),
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Location hidden";
}

/**
 * Minimal defaults for a brand-new profile row.
 * display_name, full_name, and username are intentionally null so the
 * profile setup gate forces the user to choose their own identity.
 */
function profileDefaults(user: User) {
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  return {
    id: user.id,
    display_name: null,
    full_name: null,
    username: null,
    avatar_url: avatarUrl,
    status: "active",
    preferred_language: normalizeLanguage(user.user_metadata?.preferred_language),
  };
}

export async function fetchProfile(userId: string): Promise<AppProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new ProfileSaveError("select", error);
  return (data as AppProfile | null) ?? null;
}

export async function ensureUserProfile(user: User): Promise<AppProfile | null> {
  const existing = await fetchProfile(user.id).catch(() => null);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("profiles")
    .insert(profileDefaults(user))
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    // Row may have been created by a DB trigger between our check and insert
    if (error.code === "23505") {
      return fetchProfile(user.id);
    }
    throw new ProfileSaveError("upsert", error);
  }

  return (data as AppProfile | null) ?? null;
}

export async function updateProfileIdentity(
  userId: string,
  input: Partial<ProfileIdentityInput>,
): Promise<AppProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) throw new ProfileSaveError("update", error);

  if (!data) {
    const upserted = await supabase
      .from("profiles")
      .upsert({ id: userId, ...input })
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (upserted.error) throw new ProfileSaveError("upsert", upserted.error);
    return upserted.data as AppProfile;
  }

  return data as AppProfile;
}

export async function updateProfilePrivacy(
  userId: string,
  input: ProfilePrivacyInput,
): Promise<AppProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) throw new ProfileSaveError("update", error);

  if (!data) {
    throw new ProfileSaveError("update", new Error("Profile not found."));
  }

  return data as AppProfile;
}

export async function updateProfileLanguage(
  userId: string,
  preferredLanguage: SupportedLanguage,
): Promise<AppProfile> {
  const input: ProfileLanguageInput = {
    preferred_language: preferredLanguage,
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) throw new ProfileSaveError("update", error);

  if (!data) {
    throw new ProfileSaveError("update", new Error("Profile not found."));
  }

  return data as AppProfile;
}

export async function updateProfileAvatar(
  userId: string,
  avatarUrl: string,
): Promise<AppProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ profile_image_url: avatarUrl })
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) throw new ProfileSaveError("avatar-update", error);

  if (!data) {
    const upserted = await supabase
      .from("profiles")
      .upsert({ id: userId, profile_image_url: avatarUrl })
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (upserted.error) throw new ProfileSaveError("avatar-upsert", upserted.error);
    return upserted.data as AppProfile;
  }

  return data as AppProfile;
}
