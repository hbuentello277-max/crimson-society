import { NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin-api";
import { formatOrderStatusLabel, normalizePaymentStatus } from "@/lib/shop/orders";
import { syncMerchOrderPaymentFromStripeSession } from "@/lib/shop/sync-merch-order-payment";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

/** Lookup a merch order for the success page by Stripe Checkout session id. */
export async function GET(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  const admin = createAdminServiceClient();

  let { data: order, error: orderError } = await auth.supabase
    .from("shop_orders")
    .select("id, status, total_cents, subtotal_cents, shipping_cents, currency, created_at")
    .eq("stripe_checkout_session_id", sessionId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  if (!order) {
    const { data: bySession } = await admin
      .from("shop_orders")
      .select("id, status, total_cents, subtotal_cents, shipping_cents, currency, created_at")
      .eq("stripe_checkout_session_id", sessionId)
      .eq("user_id", auth.userId)
      .maybeSingle();

    order = bySession;
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const paymentStatus = normalizePaymentStatus(String(order.status));
  if (paymentStatus === "pending") {
    await syncMerchOrderPaymentFromStripeSession(admin, {
      sessionId,
      userId: auth.userId,
    });

    const { data: refreshed, error: refreshError } = await auth.supabase
      .from("shop_orders")
      .select("id, status, total_cents, subtotal_cents, shipping_cents, currency, created_at")
      .eq("id", order.id)
      .maybeSingle();

    if (!refreshError && refreshed) {
      order = refreshed;
    }
  }

  const { count, error: countError } = await auth.supabase
    .from("shop_order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const itemCount = count ?? 0;
  const { data: qtyRows } = await auth.supabase
    .from("shop_order_items")
    .select("quantity")
    .eq("order_id", order.id);

  const totalUnits = (qtyRows ?? []).reduce((sum, row) => sum + (row.quantity ?? 0), 0);
  const normalizedStatus = normalizePaymentStatus(String(order.status));

  return NextResponse.json({
    order: {
      id: order.id,
      status: normalizedStatus,
      status_label: formatOrderStatusLabel(normalizedStatus),
      total_cents: order.total_cents,
      subtotal_cents: order.subtotal_cents,
      shipping_cents: order.shipping_cents,
      currency: order.currency,
      created_at: order.created_at,
      line_count: itemCount,
      unit_count: totalUnits,
    },
  });
}
