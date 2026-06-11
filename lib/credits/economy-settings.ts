/** Crimson Credits economy settings stored in platform_settings.crimson_credits_economy */

export const CRIMSON_CREDITS_ECONOMY_KEY = "crimson_credits_economy";

export type CrimsonCreditsEconomySettings = {
  attend_meet_credits: number;
  host_meet_credits: number;
  referral_signup_credits: number;
  referral_blackcard_credits: number;
  rider_onboarding_credits: number;
  monthly_earn_cap: number;
  credits_per_100_usd: number;
  blackcard_merch_discount_percent: number;
  earn_attend_meet_enabled: boolean;
  earn_host_meet_enabled: boolean;
  earn_referral_signup_enabled: boolean;
  earn_referral_blackcard_enabled: boolean;
  earn_rider_onboarding_enabled: boolean;
};

export const DEFAULT_CRIMSON_CREDITS_ECONOMY: CrimsonCreditsEconomySettings = {
  attend_meet_credits: 10,
  host_meet_credits: 20,
  referral_signup_credits: 25,
  referral_blackcard_credits: 50,
  rider_onboarding_credits: 100,
  monthly_earn_cap: 500,
  credits_per_100_usd: 5,
  blackcard_merch_discount_percent: 10,
  earn_attend_meet_enabled: true,
  earn_host_meet_enabled: true,
  earn_referral_signup_enabled: true,
  earn_referral_blackcard_enabled: true,
  earn_rider_onboarding_enabled: true,
};

const INT_FIELDS: (keyof CrimsonCreditsEconomySettings)[] = [
  "attend_meet_credits",
  "host_meet_credits",
  "referral_signup_credits",
  "referral_blackcard_credits",
  "rider_onboarding_credits",
  "monthly_earn_cap",
  "credits_per_100_usd",
  "blackcard_merch_discount_percent",
];

const BOOL_FIELDS: (keyof CrimsonCreditsEconomySettings)[] = [
  "earn_attend_meet_enabled",
  "earn_host_meet_enabled",
  "earn_referral_signup_enabled",
  "earn_referral_blackcard_enabled",
  "earn_rider_onboarding_enabled",
];

function parsePositiveInt(value: unknown, field: string, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > max) {
    throw new Error(`Invalid ${field}: must be an integer from 0 to ${max}.`);
  }
  return n;
}

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("Invalid toggle: expected boolean.");
}

export function mergeEconomySettings(
  raw: Record<string, unknown> | null | undefined,
): CrimsonCreditsEconomySettings {
  const base = { ...DEFAULT_CRIMSON_CREDITS_ECONOMY };
  if (!raw) return base;

  const merged = { ...base, ...raw } as CrimsonCreditsEconomySettings;

  for (const key of INT_FIELDS) {
    merged[key] = parsePositiveInt(merged[key], key, key === "blackcard_merch_discount_percent" ? 100 : 100_000) as never;
  }

  for (const key of BOOL_FIELDS) {
    merged[key] = parseBool(merged[key]) as never;
  }

  return merged;
}

export function validateEconomySettingsPatch(
  patch: Record<string, unknown>,
): { ok: true; value: Partial<CrimsonCreditsEconomySettings> } | { ok: false; error: string } {
  const allowed = new Set([...INT_FIELDS, ...BOOL_FIELDS]);
  const value: Partial<CrimsonCreditsEconomySettings> = {};

  for (const [key, raw] of Object.entries(patch)) {
    if (!allowed.has(key as keyof CrimsonCreditsEconomySettings)) {
      return { ok: false, error: `Unknown economy field: ${key}` };
    }

    try {
      if (INT_FIELDS.includes(key as keyof CrimsonCreditsEconomySettings)) {
        (value as Record<string, number>)[key] = parsePositiveInt(
          raw,
          key,
          key === "blackcard_merch_discount_percent" ? 100 : 100_000,
        );
      } else {
        (value as Record<string, boolean>)[key] = parseBool(raw);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid value.";
      return { ok: false, error: message };
    }
  }

  return { ok: true, value };
}

export function economySettingsToRowValue(settings: CrimsonCreditsEconomySettings): Record<string, unknown> {
  return { ...settings };
}
