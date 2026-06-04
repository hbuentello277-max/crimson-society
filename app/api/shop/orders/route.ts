import { NextResponse } from "next/server";
import { serializeOrder } from "@/lib/shop/serialize-order";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

const ORDER_SELECT =
  "id, user_id, status, fulfillment_status, subtotal_cents, shipping_cents, total_cents, currency, shipping_email, fulfilled_at, shipped_at, tracking_number, tracking_carrier, tracking_url, customer_note, created_at, updated_at";

export async function GET(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 100);

  const { data, error } = await auth.supabase
    .from("shop_orders")
    .select(`${ORDER_SELECT}, shop_order_items(product_image_url, quantity)`)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = (data ?? []).map((row) => {
    const items = (row.shop_order_items as { product_image_url?: string; quantity?: number }[]) ?? [];
    const serialized = serializeOrder(row);
    return {
      ...serialized,
      line_count: items.length,
      unit_count: items.reduce((sum, item) => sum + (item.quantity ?? 0), 0),
      first_product_image_url: items[0]?.product_image_url ?? null,
    };
  });

  return NextResponse.json({ orders });
}
