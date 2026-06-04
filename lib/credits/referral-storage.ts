const REFERRAL_CODE_STORAGE_KEY = "crimson_referral_code";

export function persistReferralCode(code: string) {
  if (typeof window === "undefined") return;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  window.localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, normalized);
}

export function readPersistedReferralCode() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(REFERRAL_CODE_STORAGE_KEY);
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

export function clearPersistedReferralCode() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
}
