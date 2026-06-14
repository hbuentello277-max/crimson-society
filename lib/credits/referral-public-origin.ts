import { buildReferralSignupUrl } from "@/lib/credits/referral-link";

export const PUBLIC_REFERRAL_SIGNUP_ORIGIN = "https://www.crimson-society.com";

export const PUBLIC_APP_SIGNUP_URL = `${PUBLIC_REFERRAL_SIGNUP_ORIGIN}/signup`;

export function buildPublicReferralSignupUrl(referralCode: string) {
  return buildReferralSignupUrl(referralCode, PUBLIC_REFERRAL_SIGNUP_ORIGIN);
}
