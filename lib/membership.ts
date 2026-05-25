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

export function normalizeMembershipPlanType(
  planType: string | null | undefined
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

export function formatMembershipPlanType(planType?: string | null) {
  const normalized = normalizeMembershipPlanType(planType);
  if (normalized === "yearly") return "Yearly";
  if (normalized === "monthly") return "Monthly";
  return "Blackcard";
}
