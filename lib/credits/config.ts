/** Crimson Credits Phase 3 V1 — flat earn amounts (no tier multipliers). */

export const CRIMSON_CREDITS_MONTHLY_EARN_CAP = 500;

/** 100 credits = $5.00 reward value */
export const CRIMSON_CREDITS_PER_100_VALUE_USD = 5;

export const CRIMSON_CREDIT_USD_VALUE = CRIMSON_CREDITS_PER_100_VALUE_USD / 100;

export const CREDIT_EARN_AMOUNTS = {
  meet_attended: 10,
  meet_hosted: 20,
  referral_signup: 25,
  referral_blackcard: 50,
} as const;

export function formatCreditsRewardValueUsd(credits: number) {
  const dollars = credits * CRIMSON_CREDIT_USD_VALUE;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function canRedeemCrimsonCredits(tier: "free" | "blackcard" | "founding") {
  return tier === "blackcard" || tier === "founding";
}
