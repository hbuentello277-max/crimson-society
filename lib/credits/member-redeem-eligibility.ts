import {
  hasActiveMembership,
  resolveBlackcardAccess,
  type BlackcardAccessOptions,
  type MembershipProfileFields,
  type MembershipRow,
} from "@/lib/membership";

export type MemberRedeemProfileRow = MembershipProfileFields & {
  role?: string | null;
  is_admin?: boolean | null;
  status?: string | null;
};

export function profileIsAdminAccount(profile?: MemberRedeemProfileRow | null) {
  if (!profile || profile.status !== "active") return false;
  return profile.is_admin === true || profile.role === "admin";
}

/** Matches profile badge / Blackcard full-access used across the app. */
export function memberCanRedeemCreditRewards(options: BlackcardAccessOptions) {
  return resolveBlackcardAccess(options);
}

export function memberCanRedeemFromProfileAndSubscription(
  profile: MemberRedeemProfileRow | null | undefined,
  subscription: MembershipRow | null | undefined,
) {
  const membership = subscription && hasActiveMembership(subscription) ? subscription : null;

  return memberCanRedeemCreditRewards({
    membership,
    isAdmin: profileIsAdminAccount(profile),
    profile: profile ?? undefined,
    blackcardPublic: profile?.blackcard_public,
  });
}
