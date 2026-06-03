/**
 * Crimson Credits × Blackcard integration plan.
 * Foundation tables exist; earning/spend hooks are Phase 3.
 */

export type CreditEarnEvent =
  | "meet_attended"
  | "meet_hosted"
  | "post_created"
  | "comment_created"
  | "shop_purchase";

export type CreditTier = "regular" | "blackcard" | "founding";

/** Base earn amounts before multipliers. */
export const CREDIT_EARN_BASE: Record<CreditEarnEvent, number> = {
  meet_attended: 25,
  meet_hosted: 50,
  post_created: 10,
  comment_created: 5,
  shop_purchase: 15,
};

/** Blackcard earns 2× on participation events. */
export const BLACKCARD_CREDIT_MULTIPLIER = 2;

export function creditEarnAmount(event: CreditEarnEvent, tier: CreditTier) {
  const base = CREDIT_EARN_BASE[event];
  if (tier === "blackcard" || tier === "founding") {
    return base * BLACKCARD_CREDIT_MULTIPLIER;
  }
  return base;
}

/** Example: regular 25, Blackcard 50 for attending a meet. */
export function meetAttendanceCredits(tier: CreditTier) {
  return creditEarnAmount("meet_attended", tier);
}

export const CREDITS_ROADMAP_FEATURES = [
  "Automatic earn on meet attendance",
  "Automatic earn on hosting and engagement",
  "Blackcard 2× participation multiplier",
  "Blackcard-only redemption catalog",
  "Credit discounts on merch checkout",
  "Founding member lifetime multiplier stack",
] as const;
