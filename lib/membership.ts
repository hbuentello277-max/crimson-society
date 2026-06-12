export const MEMBERSHIP_PLAN_TYPES = ["monthly", "yearly"] as const;

export type MembershipPlanType = (typeof MEMBERSHIP_PLAN_TYPES)[number];

/** Canonical Crimson Society membership tiers. */
export type CrimsonMembershipTier = "free" | "blackcard" | "founding" | "founder";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | null;

export type MembershipRow = {
  status: SubscriptionStatus;
  plan_type: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean;
  cancel_at?: string | null;
  canceled_at?: string | null;
  created_at?: string | null;
};

export type MembershipProfileFields = {
  is_premium?: boolean | null;
  premium_tier?: string | null;
  premium_expires_at?: string | null;
  is_founder_blackcard?: boolean | null;
  founder_blackcard_granted_at?: string | null;
  is_founding_blackcard?: boolean | null;
  founding_blackcard_granted_at?: string | null;
  membership_tier?: CrimsonMembershipTier | string | null;
  blackcard_public?: boolean | null;
};

export type BlackcardAccessOptions = {
  membership?: MembershipRow | null;
  isAdmin?: boolean;
  profile?: MembershipProfileFields | null;
  blackcardPublic?: boolean | null;
};

export function normalizeMembershipPlanType(
  planType: string | null | undefined,
): MembershipPlanType | null {
  if (!planType) return null;
  if (planType === "monthly" || planType === "apex_monthly") return "monthly";
  if (planType === "yearly" || planType === "apex_yearly") return "yearly";
  return null;
}

export function checkoutPlanType(planType: MembershipPlanType) {
  return planType;
}

export function hasActiveMembership(membership: MembershipRow | null) {
  if (!membership) return false;
  if (membership.status !== "active" && membership.status !== "trialing") {
    return false;
  }
  if (!membership.current_period_end) return true;

  return new Date(membership.current_period_end).getTime() >= Date.now();
}

export function isFounderBlackcard(profile?: MembershipProfileFields | null) {
  return profile?.is_founder_blackcard === true;
}

export function isFoundingBlackcardMember(profile?: MembershipProfileFields | null) {
  return profile?.is_founding_blackcard === true;
}

export function hasAdminBlackcardOverride(profile?: MembershipProfileFields | null) {
  if (!profile?.is_premium) return false;
  if ((profile.premium_tier || "").toLowerCase() !== "blackcard") return false;
  if (
    profile.premium_expires_at &&
    new Date(profile.premium_expires_at).getTime() < Date.now()
  ) {
    return false;
  }
  return true;
}

export function normalizeMembershipTier(
  value: string | null | undefined,
): CrimsonMembershipTier | null {
  if (value === "free" || value === "blackcard" || value === "founding" || value === "founder") {
    return value;
  }
  return null;
}

/** Resolve the visible membership tier for profile display and future perks. */
export function resolveMembershipTier(options: BlackcardAccessOptions): CrimsonMembershipTier {
  const profile = options.profile;

  if (isFounderBlackcard(profile)) {
    return "founder";
  }

  if (isFoundingBlackcardMember(profile)) {
    return "founding";
  }

  if (
    options.isAdmin === true ||
    options.blackcardPublic === true ||
    hasAdminBlackcardOverride(profile) ||
    hasActiveMembership(options.membership ?? null)
  ) {
    return "blackcard";
  }

  const stored = normalizeMembershipTier(profile?.membership_tier ?? null);
  if (stored === "founder" || stored === "founding" || stored === "blackcard") {
    return stored;
  }

  return "free";
}

/** True when user may access any Blackcard-gated feature. */
export function resolveBlackcardAccess(options: BlackcardAccessOptions) {
  return resolveMembershipTier(options) !== "free";
}

export function hasBlackcardAccess(
  membership: MembershipRow | null,
  isAdmin?: boolean,
  options?: Omit<BlackcardAccessOptions, "membership" | "isAdmin">,
) {
  return resolveBlackcardAccess({
    membership,
    isAdmin,
    profile: options?.profile,
    blackcardPublic: options?.blackcardPublic,
  });
}

export function membershipTierLabel(tier: CrimsonMembershipTier) {
  switch (tier) {
    case "founder":
      return "Founder Blackcard";
    case "founding":
      return "Founding Blackcard Member";
    case "blackcard":
      return "Blackcard Member";
    default:
      return "Free Member";
  }
}

export function membershipStatusLabel(options: {
  membership?: MembershipRow | null;
  profile?: MembershipProfileFields | null;
  isAdmin?: boolean;
}) {
  const tier = resolveMembershipTier(options);

  if (options.isAdmin) return "Admin · full access";
  if (tier === "founder") {
    const granted = options.profile?.founder_blackcard_granted_at;
    return granted
      ? `Founder Blackcard · granted ${new Date(granted).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : "Founder Blackcard · permanent";
  }
  if (tier === "founding") {
    const granted = options.profile?.founding_blackcard_granted_at;
    return granted
      ? `Founding Blackcard · granted ${new Date(granted).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : "Founding Blackcard · lifetime";
  }
  if (hasAdminBlackcardOverride(options.profile)) {
    if (options.profile?.premium_expires_at) {
      return `Admin override · expires ${new Date(options.profile.premium_expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return "Admin override · active";
  }
  if (hasActiveMembership(options.membership ?? null)) {
    const plan = formatMembershipPlanType(options.membership?.plan_type);
    if (options.membership?.current_period_end) {
      return `Stripe ${plan} · renews ${new Date(options.membership.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return `Stripe ${plan} · active`;
  }
  return "Free Member";
}

export function subscriptionStatusLabel(membership: MembershipRow | null | undefined) {
  if (!membership?.status) return "None";
  return membership.status.replace(/_/g, " ");
}

export function creditTierFromMembership(tier: CrimsonMembershipTier) {
  if (tier === "founder" || tier === "founding") return "founding" as const;
  if (tier === "blackcard") return "blackcard" as const;
  return "regular" as const;
}

export function formatMembershipPlanType(planType?: string | null) {
  const normalized = normalizeMembershipPlanType(planType);
  if (normalized === "yearly") return "Yearly";
  if (normalized === "monthly") return "Monthly";
  return "Blackcard";
}

/** @deprecated Use MembershipProfileFields */
export type AdminBlackcardOverride = MembershipProfileFields;
