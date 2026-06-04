import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export type MerchFulfillmentResult = {
  ok: boolean;
  order_id?: string;
  reason?: string;
};

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

/**
 * Marks a pending merch order paid and completes inventory reservations.
 * Safe to call when order is already paid (no-op).
 */
export async function fulfillMerchOrderFromCheckoutSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<MerchFulfillmentResult> {
  const metadata = session.metadata ?? {};
  if (metadata.checkout_type !== "merch") {
    return { ok: false, reason: "not_merch_checkout" };
  }

  const orderId =
    metadata.shop_order_id?.trim() ||
    session.client_reference_id?.trim() ||
    null;

  if (!orderId) {
    console.warn("[merch-fulfill] missing shop_order_id", session.id);
    return { ok: false, reason: "missing_order_id" };
  }

  const { data: order, error: orderError } = await admin
    .from("shop_orders")
    .select("id, status, stripe_checkout_session_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("[merch-fulfill] order load failed", orderError.message);
    return { ok: false, reason: "order_load_error" };
  }

  if (!order) {
    console.warn("[merch-fulfill] order not found", orderId);
    return { ok: false, reason: "order_not_found" };
  }

  if (order.status === "paid") {
    return { ok: true, order_id: orderId, reason: "already_paid" };
  }

  if (order.status !== "pending") {
    console.warn("[merch-fulfill] unexpected order status", orderId, order.status);
    return { ok: false, reason: "invalid_order_status" };
  }

  const { data: items, error: itemsError } = await admin
    .from("shop_order_items")
    .select("id, reservation_id")
    .eq("order_id", orderId);

  if (itemsError) {
    console.error("[merch-fulfill] items load failed", itemsError.message);
    return { ok: false, reason: "items_load_error" };
  }

  for (const item of items ?? []) {
    const reservationId = item.reservation_id as string | null;
    if (!reservationId) continue;

    const { error: completeError } = await admin.rpc(
      "product_inventory_complete_reservation",
      { p_reservation_id: reservationId },
    );

    if (completeError) {
      console.warn(
        "[merch-fulfill] complete reservation failed",
        reservationId,
        completeError.message,
      );
    }
  }

  const piId = paymentIntentId(session);

  const { error: updateError } = await admin
    .from("shop_orders")
    .update({
      status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: piId,
    })
    .eq("id", orderId)
    .eq("status", "pending");

  if (updateError) {
    console.error("[merch-fulfill] order update failed", updateError.message);
    return { ok: false, reason: "order_update_error" };
  }

  return { ok: true, order_id: orderId };
}
