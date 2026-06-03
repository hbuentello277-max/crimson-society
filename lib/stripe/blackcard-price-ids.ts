import type { MembershipPlanType } from "@/lib/membership";

const ENV_KEYS: Record<MembershipPlanType, string> = {
  monthly: "STRIPE_BLACKCARD_MONTHLY_PRICE_ID",
  yearly: "STRIPE_BLACKCARD_YEARLY_PRICE_ID",
};

/** Legacy env names kept as fallback during migration. */
const LEGACY_ENV_KEYS: Record<MembershipPlanType, string> = {
  monthly: "STRIPE_APEX_MONTHLY_PRICE_ID",
  yearly: "STRIPE_APEX_YEARLY_PRICE_ID",
};

export function getBlackcardStripePriceEnvKey(planType: MembershipPlanType) {
  return ENV_KEYS[planType];
}

export function resolveBlackcardStripePriceId(
  planType: MembershipPlanType,
  dbStripePriceId?: string | null,
): { priceId: string | null; source: "env" | "db" | null } {
  const envPriceId =
    process.env[ENV_KEYS[planType]]?.trim() ||
    process.env[LEGACY_ENV_KEYS[planType]]?.trim() ||
    null;

  if (envPriceId) {
    return { priceId: envPriceId, source: "env" };
  }

  const dbPriceId = dbStripePriceId?.trim() || null;
  if (dbPriceId) {
    return { priceId: dbPriceId, source: "db" };
  }

  return { priceId: null, source: null };
}
