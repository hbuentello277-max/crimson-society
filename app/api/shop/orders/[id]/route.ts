import { NextResponse } from "next/server";
import { serializeOrder } from "@/lib/shop/serialize-order";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

const ORDER_SELECT =
  "id, user_id, status, fulfillment_status, delivery_method, pickup_status, subtotal_cents, shipping_cents, total_cents, currency, shipping_email, fulfilled_at, shipped_at, tracking_number, tracking_carrier, tracking_url, customer_note, pickup_note, pickup_ready_at, picked_up_at, archived_at, created_at, updated_at, shop_order_items(id, order_id, product_id, product_name, product_image_url, size, quantity, unit_price_cents, line_total_cents, created_at)";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await context.params;
  const orderId = id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("shop_orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (data.archived_at) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order: serializeOrder(data, true) });
}
