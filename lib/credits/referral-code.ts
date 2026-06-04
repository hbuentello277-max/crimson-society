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

export function normalizeReferralCodeInput(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function validateReferralCodeFormat(code: string): string | null {
  const normalized = normalizeReferralCodeInput(code);

  if (normalized.length < 3 || normalized.length > 20) {
    return "Use 3–20 characters (letters A–Z and numbers only).";
  }

  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return "Only uppercase letters and numbers are allowed.";
  }

  if (RESERVED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
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
  invalid_format: "Use 3–20 characters: uppercase letters (A–Z) and numbers only.",
  not_unique: "That code is already taken. Try another.",
  could_not_generate: "Could not generate a code. Set a username first, then try again.",
};
