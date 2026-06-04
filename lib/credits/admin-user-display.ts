/** Display helpers for admin credits UI — no raw UUIDs in primary views. */

export type AdminProfileMembershipFields = {
  is_premium?: boolean | null;
  premium_tier?: string | null;
  membership_tier?: string | null;
  is_founding_blackcard?: boolean | null;
};

export type AdminUserIdentityFields = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
} & AdminProfileMembershipFields;

export function resolveAvatarUrl(profile: Pick<AdminUserIdentityFields, "avatar_url" | "profile_image_url">) {
  return profile.profile_image_url || profile.avatar_url || null;
}

export function resolveDisplayLabel(profile: Pick<AdminUserIdentityFields, "display_name" | "full_name" | "username" | "email">) {
  return (
    profile.display_name?.trim() ||
    profile.full_name?.trim() ||
    (profile.username ? `@${profile.username}` : null) ||
    profile.email?.trim() ||
    "Unknown member"
  );
}

export function resolveUsernameHandle(profile: Pick<AdminUserIdentityFields, "username" | "email">) {
  if (profile.username?.trim()) {
    return `@${profile.username.replace(/^@+/, "")}`;
  }
  if (profile.email?.trim()) {
    return profile.email;
  }
  return null;
}

export function resolveMembershipLabel(profile: AdminProfileMembershipFields): string {
  if (profile.is_founding_blackcard) {
    return "Founding Blackcard";
  }
  if (profile.is_premium && (profile.premium_tier || "").toLowerCase() === "blackcard") {
    return "Blackcard Member";
  }
  const tier = (profile.membership_tier || "").toLowerCase();
  if (tier === "founding") return "Founding Blackcard";
  if (tier === "blackcard") return "Blackcard Member";
  if (tier) {
    return tier.charAt(0).toUpperCase() + tier.slice(1) + " Member";
  }
  return "Free Member";
}
