export const MEMBERSHIP_PLAN_TYPES = ["monthly", "yearly"] as const;

export type MembershipPlanType = (typeof MEMBERSHIP_PLAN_TYPES)[number];

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
  created_at?: string | null;
};

export type AdminBlackcardOverride = {
  is_premium?: boolean | null;
  premium_tier?: string | null;
  premium_expires_at?: string | null;
  is_founding_blackcard?: boolean | null;
};

export type BlackcardAccessOptions = {
  membership?: MembershipRow | null;
  isAdmin?: boolean;
  adminOverride?: AdminBlackcardOverride | null;
  blackcardPublic?: boolean | null;
  isFoundingBlackcard?: boolean | null;
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

export function hasAdminBlackcardOverride(
  override: AdminBlackcardOverride | null | undefined,
) {
  if (!override?.is_premium) return false;
  if ((override.premium_tier || "").toLowerCase() !== "blackcard") return false;
  if (
    override.premium_expires_at &&
    new Date(override.premium_expires_at).getTime() < Date.now()
  ) {
    return false;
  }
  return true;
}

export function isFoundingBlackcardMember(profile?: AdminBlackcardOverride | null) {
  return profile?.is_founding_blackcard === true;
}

export function resolveBlackcardAccess(options: BlackcardAccessOptions) {
  if (options.isAdmin === true) return true;
  if (options.isFoundingBlackcard === true || isFoundingBlackcardMember(options.adminOverride)) return true;
  if (options.blackcardPublic === true) return true;
  if (hasAdminBlackcardOverride(options.adminOverride)) return true;
  return hasActiveMembership(options.membership ?? null);
}

export function hasBlackcardAccess(
  membership: MembershipRow | null,
  isAdmin?: boolean,
  options?: Omit<BlackcardAccessOptions, "membership" | "isAdmin">,
) {
  return resolveBlackcardAccess({
    membership,
    isAdmin,
    adminOverride: options?.adminOverride,
    blackcardPublic: options?.blackcardPublic,
  });
}

export function formatMembershipPlanType(planType?: string | null) {
  const normalized = normalizeMembershipPlanType(planType);
  if (normalized === "yearly") return "Yearly";
  if (normalized === "monthly") return "Monthly";
  return "Blackcard";
}

export function membershipStatusLabel(options: {
  membership?: MembershipRow | null;
  adminOverride?: AdminBlackcardOverride | null;
  isAdmin?: boolean;
}) {
  if (options.isAdmin) return "Admin";
  if (isFoundingBlackcardMember(options.adminOverride)) return "Founding Blackcard · lifetime";
  if (hasAdminBlackcardOverride(options.adminOverride)) {
    if (options.adminOverride?.premium_expires_at) {
      return `Admin override · expires ${new Date(options.adminOverride.premium_expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
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
  return "Regular";
}

export function subscriptionStatusLabel(membership: MembershipRow | null | undefined) {
  if (!membership?.status) return "None";
  return membership.status.replace(/_/g, " ");
}
