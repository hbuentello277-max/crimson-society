import { buildReferralSignupUrl } from "@/lib/credits/referral-link";

export const PUBLIC_REFERRAL_SIGNUP_ORIGIN = "https://www.crimson-society.com";

export function buildPublicReferralSignupUrl(referralCode: string) {
  return buildReferralSignupUrl(referralCode, PUBLIC_REFERRAL_SIGNUP_ORIGIN);
}
