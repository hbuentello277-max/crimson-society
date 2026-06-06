import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetricCollectionWarning } from "@/lib/metrics/types";

export function nowIso(): string {
  return new Date().toISOString();
}

export function startOfUtcDayIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}

export function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60_000).toISOString();
}

export function floorToFiveMinuteBucket(date = new Date()): string {
  const bucketMs = 5 * 60_000;
  return new Date(Math.floor(date.getTime() / bucketMs) * bucketMs).toISOString();
}

export function addWarning(
  warnings: MetricCollectionWarning[],
  field: string,
  message: string,
): void {
  warnings.push({ field, message });
}

export async function countTableRows(
  admin: SupabaseClient,
  table: string,
  options?: {
    timestampColumn?: string;
    sinceIso?: string;
    filters?: Array<{ column: string; op: "eq" | "gte" | "lte" | "in" | "is" | "neq" | "not"; value: unknown }>;
  },
): Promise<{ count: number | null; error: string | null }> {
  let query = admin.from(table).select("*", { count: "exact", head: true });

  if (options?.sinceIso) {
    query = query.gte(options.timestampColumn ?? "created_at", options.sinceIso);
  }

  for (const filter of options?.filters ?? []) {
    if (filter.op === "eq") {
      query = query.eq(filter.column, filter.value);
    } else if (filter.op === "gte") {
      query = query.gte(filter.column, filter.value);
    } else if (filter.op === "lte") {
      query = query.lte(filter.column, filter.value);
    } else if (filter.op === "in") {
      query = query.in(filter.column, filter.value as string[]);
    } else if (filter.op === "is") {
      query = query.is(filter.column, filter.value as null);
    } else if (filter.op === "neq") {
      query = query.neq(filter.column, filter.value);
    } else if (filter.op === "not") {
      query = query.not(filter.column, "in", filter.value as string);
    }
  }

  const { count, error } = await query;
  if (error) {
    return { count: null, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

export async function countAuthUsers(
  admin: SupabaseClient,
  options?: { sinceIso?: string; column?: "created_at" | "last_sign_in_at" },
): Promise<{ count: number | null; error: string | null }> {
  let query = admin.schema("auth").from("users").select("*", { count: "exact", head: true });

  if (options?.sinceIso) {
    query = query.gte(options.column ?? "created_at", options.sinceIso);
  }

  const { count, error } = await query;
  if (error) {
    return { count: null, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

export type MembershipPlanPrices = {
  monthly: number;
  yearly: number;
};

const DEFAULT_PLAN_PRICES: MembershipPlanPrices = {
  monthly: 10,
  yearly: 90,
};

export async function loadMembershipPlanPrices(
  admin: SupabaseClient,
  warnings: MetricCollectionWarning[],
): Promise<MembershipPlanPrices> {
  const { data, error } = await admin
    .from("membership_plans")
    .select("plan_type, price")
    .in("plan_type", ["monthly", "yearly"]);

  if (error) {
    addWarning(warnings, "membership_plans", error.message);
    return DEFAULT_PLAN_PRICES;
  }

  const monthly = Number(data?.find((row) => row.plan_type === "monthly")?.price ?? DEFAULT_PLAN_PRICES.monthly);
  const yearly = Number(data?.find((row) => row.plan_type === "yearly")?.price ?? DEFAULT_PLAN_PRICES.yearly);

  return {
    monthly: Number.isFinite(monthly) ? monthly : DEFAULT_PLAN_PRICES.monthly,
    yearly: Number.isFinite(yearly) ? yearly : DEFAULT_PLAN_PRICES.yearly,
  };
}

export function estimateMrr(input: {
  monthlyCount: number;
  yearlyCount: number;
  prices: MembershipPlanPrices;
}): number {
  const monthlyRevenue = input.monthlyCount * input.prices.monthly;
  const yearlyMonthlyEquivalent = input.yearlyCount * (input.prices.yearly / 12);
  return Math.round((monthlyRevenue + yearlyMonthlyEquivalent) * 100) / 100;
}
