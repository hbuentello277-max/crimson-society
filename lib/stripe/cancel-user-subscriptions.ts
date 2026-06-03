import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

export type StripeCancelResult = {
  ok: boolean;
  canceledIds: string[];
  errors: string[];
};

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);

async function cancelSubscriptionId(
  stripe: ReturnType<typeof getStripe>,
  adminClient: SupabaseClient,
  userId: string,
  customerId: string | null,
  subscriptionId: string,
  canceledIds: string[],
  errors: string[],
) {
  if (canceledIds.includes(subscriptionId)) return;

  try {
    await stripe.subscriptions.cancel(subscriptionId);
    canceledIds.push(subscriptionId);

    await adminClient
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: "canceled",
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe cancel failed.";
    errors.push(`${subscriptionId}: ${message}`);
  }
}

/**
 * Cancels all active Stripe subscriptions for a user. Fails if any cancel call fails
 * or active subscriptions remain afterward.
 */
export async function cancelUserStripeSubscriptions(
  adminClient: SupabaseClient,
  userId: string,
): Promise<StripeCancelResult> {
  const canceledIds: string[] = [];
  const errors: string[] = [];

  const { data: rows, error: loadError } = await adminClient
    .from("subscriptions")
    .select("stripe_subscription_id, status, stripe_customer_id")
    .eq("user_id", userId);

  if (loadError) {
    return { ok: false, canceledIds, errors: [loadError.message] };
  }

  const stripe = getStripe();
  let customerId: string | null = null;

  const { data: customerRow } = await adminClient
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  customerId = (customerRow?.stripe_customer_id as string) ?? null;

  for (const row of rows ?? []) {
    if (!ACTIVE_STATUSES.has(String(row.status || "").toLowerCase())) continue;
    const subId = row.stripe_subscription_id as string | null;
    if (!subId) continue;
    customerId = customerId ?? (row.stripe_customer_id as string | null);
    await cancelSubscriptionId(
      stripe,
      adminClient,
      userId,
      customerId,
      subId,
      canceledIds,
      errors,
    );
  }

  if (customerId) {
    for (const status of ["active", "trialing"] as const) {
      const listed = await stripe.subscriptions.list({
        customer: customerId,
        status,
        limit: 50,
      });

      for (const sub of listed.data) {
        await cancelSubscriptionId(
          stripe,
          adminClient,
          userId,
          customerId,
          sub.id,
          canceledIds,
          errors,
        );
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, canceledIds, errors };
  }

  if (customerId) {
    const [active, trialing] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 5 }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 5 }),
    ]);

    const remaining = [...active.data, ...trialing.data];
    if (remaining.length > 0) {
      return {
        ok: false,
        canceledIds,
        errors: [`Active Stripe subscription(s) remain: ${remaining.map((s) => s.id).join(", ")}`],
      };
    }
  }

  return { ok: true, canceledIds, errors };
}
