const RESERVED_PREFIXES = [
  "ADMIN",
  "MOD",
  "MODERATOR",
  "SUPPORT",
  "HELP",
  "SYSTEM",
  "ROOT",
  "API",
  "NULL",
  "UNDEFINED",
  "TEST",
  "DEBUG",
  "REF",
  "REFERRAL",
  "CRIMSON",
  "BLACKCARD",
  "SOCIETY",
  "STAFF",
  "OFFICIAL",
  "FUCK",
  "SHIT",
  "ASS",
  "NAZI",
  "NIGGER",
  "FAGGOT",
] as const;

const REFERRAL_CODE_PATTERN = /^[A-Za-z0-9._-]{3,20}$/;

/** Trim and strip spaces; preserve user casing and allowed symbols. */
export function normalizeReferralCodeInput(value: string) {
  return value.trim().replace(/\s+/g, "");
}

/** Canonical key for duplicate checks and lookups (case-insensitive). */
export function referralCodeLookupKey(value: string) {
  return normalizeReferralCodeInput(value).toUpperCase();
}

export function validateReferralCodeFormat(code: string): string | null {
  const normalized = normalizeReferralCodeInput(code);

  if (normalized.length < 3 || normalized.length > 20) {
    return "Use 3–20 characters (letters, numbers, . _ -).";
  }

  if (!REFERRAL_CODE_PATTERN.test(normalized)) {
    return "Only letters, numbers, periods, underscores, and hyphens are allowed.";
  }

  if (RESERVED_PREFIXES.some((prefix) => referralCodeLookupKey(normalized).startsWith(prefix))) {
    return "That code is reserved. Try another.";
  }

  return null;
}

export const REFERRAL_ATTRIBUTION_ERRORS: Record<string, string> = {
  invalid_code: "That referral code wasn't found. Double-check and try again.",
  self_referral: "You can't use your own referral code.",
  already_referred: "You already have a referrer on your account.",
  no_code: "",
};

export const SET_REFERRAL_CODE_ERRORS: Record<string, string> = {
  invalid_format: "Use 3–20 characters: letters, numbers, and . _ - only.",
  not_unique: "That code is already taken. Try another.",
  could_not_generate: "Could not generate a code. Set a username first, then try again.",
};
