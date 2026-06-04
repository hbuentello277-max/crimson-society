/**
 * Crimson Credits × Blackcard integration.
 * Phase 3 V1 earn amounts live in @/lib/credits/config (flat rates; no multipliers).
 */

export {
  CREDIT_EARN_AMOUNTS as CREDIT_EARN_BASE,
  CRIMSON_CREDITS_MONTHLY_EARN_CAP,
  canRedeemCrimsonCredits,
} from "@/lib/credits/config";

export const CREDITS_ROADMAP_FEATURES = [
  "Automatic earn on meet attendance",
  "Automatic earn on hosting",
  "Referral signup and Blackcard conversion rewards",
  "Monthly earn cap (500 credits)",
  "Blackcard reward redemption (coming soon)",
] as const;
