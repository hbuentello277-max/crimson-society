import { normalizeReferralCodeInput } from "@/lib/credits/referral-code";

const SIGNUP_REFERRAL_SESSION_KEY = "crimson_signup_referral_code";

/** Persists a user-entered referral code between signup and profile setup (same browser session). */
export function saveSignupReferralCode(code: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeReferralCodeInput(code);
  if (!normalized) return;
  window.sessionStorage.setItem(SIGNUP_REFERRAL_SESSION_KEY, normalized);
}

export function readSignupReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(SIGNUP_REFERRAL_SESSION_KEY);
  if (!value) return null;
  const normalized = normalizeReferralCodeInput(value);
  return normalized || null;
}

export function clearSignupReferralCode() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SIGNUP_REFERRAL_SESSION_KEY);
}
