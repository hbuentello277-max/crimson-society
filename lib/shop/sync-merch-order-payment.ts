import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { isShopPaymentCheckoutType } from "@/lib/shop/checkout-types";
import { fulfillMerchOrderFromCheckoutSession } from "@/lib/shop/fulfill-merch-order";

export type SyncMerchOrderPaymentResult = {
  synced: boolean;
  order_id?: string;
  reason?: string;
};

/**
 * If Stripe Checkout session is paid but our order is still pending (webhook delay),
 * run the same fulfillment path as the webhook.
 */
export async function syncMerchOrderPaymentFromStripeSession(
  admin: SupabaseClient,
  input: { sessionId: string; userId: string },
): Promise<SyncMerchOrderPaymentResult> {
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return { synced: false, reason: "stripe_not_configured" };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(input.sessionId);
  } catch (e) {
    console.warn("[merch-sync] session retrieve failed", e);
    return { synced: false, reason: "session_retrieve_failed" };
  }

  if (!isShopPaymentCheckoutType(session.metadata?.checkout_type)) {
    return { synced: false, reason: "not_merch_checkout" };
  }

  const metadataUserId = session.metadata?.supabase_user_id?.trim();
  if (metadataUserId && metadataUserId !== input.userId) {
    return { synced: false, reason: "user_mismatch" };
  }

  const orderId =
    session.metadata?.shop_order_id?.trim() ||
    session.client_reference_id?.trim() ||
    null;

  if (!orderId) {
    return { synced: false, reason: "missing_order_id" };
  }

  const { data: order, error } = await admin
    .from("shop_orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return { synced: false, reason: "order_not_found" };
  }

  if (order.user_id !== input.userId) {
    return { synced: false, reason: "forbidden" };
  }

  if (order.status === "paid") {
    return { synced: false, order_id: orderId, reason: "already_paid" };
  }

  const paid =
    session.payment_status === "paid" ||
    session.status === "complete";

  if (!paid) {
    return { synced: false, order_id: orderId, reason: "session_not_paid" };
  }

  const result = await fulfillMerchOrderFromCheckoutSession(admin, session);
  if (!result.ok) {
    return { synced: false, order_id: orderId, reason: result.reason };
  }

  return { synced: true, order_id: orderId };
}
