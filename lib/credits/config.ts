/**
 * Crimson Credits — client display defaults.
 *
 * Live earn amounts, monthly cap, and toggles are stored in
 * platform_settings.crimson_credits_economy (admin: /admin/credits → Economy).
 * SQL earn paths read crimson_credits_economy_settings().
 *
 * Meet host (20) and attend (10) credits are awarded when a meet completes:
 * - tracking_status becomes `ended`, ride status is `active` (not canceled)
 * - host started tracking (started_at set) for at least 5 minutes
 * - at least one non-host attendee with status `going`
 * Idempotency keys prevent duplicate awards; join/leave does not re-trigger earn.
 */

export const CRIMSON_CREDITS_MONTHLY_EARN_CAP = 500;

/** 100 credits = $5.00 reward value */
export const CRIMSON_CREDITS_PER_100_VALUE_USD = 5;

export const CRIMSON_CREDIT_USD_VALUE = CRIMSON_CREDITS_PER_100_VALUE_USD / 100;

/** Monthly cash-value redemption limit (display); 500 credits ≈ $25 at standard rate */
export const CRIMSON_CREDITS_MONTHLY_REDEMPTION_CAP = 500;

export const CRIMSON_CREDITS_MONTHLY_REDEMPTION_VALUE_USD =
  CRIMSON_CREDITS_MONTHLY_REDEMPTION_CAP * CRIMSON_CREDIT_USD_VALUE;

export const CREDIT_EARN_AMOUNTS = {
  meet_attended: 10,
  meet_hosted: 20,
  referral_signup: 25,
  referral_blackcard: 50,
  rider_onboarding: 100,
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

export function canRedeemCrimsonCredits(tier: "free" | "blackcard" | "founding" | "founder") {
  return tier === "blackcard" || tier === "founding" || tier === "founder";
}
