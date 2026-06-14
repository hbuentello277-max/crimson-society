export type RiderIdentityFields = {
  username?: string | null;
  display_name?: string | null;
  full_name?: string | null;
};

export function normalizeUsernameValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim().replace(/^@+/, "");
  return trimmed || null;
}

/** @username with no double-@@; optional fallback when username is missing. */
export function formatRiderHandle(
  username: string | null | undefined,
  fallback = "@rider",
): string {
  const clean = normalizeUsernameValue(username);
  return clean ? `@${clean}` : fallback;
}

/**
 * Rider identity outside profile pages/cards:
 * 1. @username when username exists
 * 2. display name (or full name) when username is missing
 * 3. fallback label
 */
export function formatRiderIdentity(
  fields: RiderIdentityFields | null | undefined,
  options?: { fallback?: string },
): string {
  const fallback = options?.fallback ?? "Rider";
  const username = normalizeUsernameValue(fields?.username);
  if (username) return `@${username}`;

  const displayName = fields?.display_name?.trim() || fields?.full_name?.trim();
  if (displayName) return displayName;

  return fallback;
}

export function riderIdentityInitial(identity: string, fallback = "R"): string {
  const trimmed = identity.replace(/^@+/, "").trim();
  return (trimmed.charAt(0) || fallback).toUpperCase();
}
