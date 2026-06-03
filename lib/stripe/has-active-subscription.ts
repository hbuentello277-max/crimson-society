import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { hasActiveMembership, type MembershipRow } from "@/lib/membership";

type SubscriptionRow = {
  status: string | null;
  plan_type: string | null;
  current_period_end: string | null;
};

export function rowHasActiveSubscription(row: SubscriptionRow | null | undefined) {
  if (!row) return false;
  return hasActiveMembership(row as MembershipRow);
}

export async function userHasActiveSubscriptionInDb(
  client: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("subscriptions")
    .select("status, plan_type, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).some((row) => rowHasActiveSubscription(row));
}

export async function stripeCustomerHasActiveSubscription(
  stripeCustomerId: string,
): Promise<boolean> {
  const stripe = getStripe();

  for (const status of ["active", "trialing"] as const) {
    const listed = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status,
      limit: 1,
    });

    if (listed.data.length > 0) {
      return true;
    }
  }

  return false;
}

export async function userHasActiveSubscription(
  client: SupabaseClient,
  userId: string,
  stripeCustomerId?: string | null,
): Promise<boolean> {
  if (await userHasActiveSubscriptionInDb(client, userId)) {
    return true;
  }

  if (stripeCustomerId) {
    return stripeCustomerHasActiveSubscription(stripeCustomerId);
  }

  return false;
}
