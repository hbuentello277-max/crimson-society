import { normalizeReferralCodeInput } from "@/lib/credits/referral-code";

export function buildReferralSignupUrl(referralCode: string, origin?: string) {
  const normalized = normalizeReferralCodeInput(referralCode);
  if (!normalized) return null;

  const base =
    origin?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "https://crimsonsociety.com");

  const url = new URL("/signup", base);
  url.searchParams.set("ref", normalized);
  return url.toString();
}

export function readReferralCodeFromSignupUrl(search: string | URLSearchParams) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const ref = params.get("ref");
  if (!ref) return null;
  const normalized = normalizeReferralCodeInput(ref);
  return normalized || null;
}

export function referralShareText(referralCode: string, signupUrl: string) {
  return `Join me on Crimson Society — use my referral code ${referralCode} or sign up here: ${signupUrl}`;
}
