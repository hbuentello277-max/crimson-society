import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { resolveStoredProductImageUrl } from "@/lib/shop/product-image-url";
import { serializeOrder } from "@/lib/shop/serialize-order";

const ORDER_SELECT =
  "id, user_id, status, fulfillment_status, delivery_method, pickup_status, subtotal_cents, shipping_cents, total_cents, currency, shipping_email, shipping_name, fulfilled_at, shipped_at, tracking_number, tracking_carrier, tracking_url, admin_fulfillment_note, customer_note, pickup_note, pickup_ready_at, picked_up_at, archived_at, archived_by, created_at, updated_at";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter")?.trim() ?? "all";
  const visibility = searchParams.get("visibility")?.trim() ?? "active";
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 100, 1), 200);

  const admin = createAdminServiceClient();
  let query = admin
    .from("shop_orders")
    .select(`${ORDER_SELECT}, shop_order_items(id, quantity, product_image_url)`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (visibility === "active") {
    query = query.is("archived_at", null);
  } else if (visibility === "archived") {
    query = query.not("archived_at", "is", null);
  }

  switch (filter) {
    case "pending":
      query = query.eq("status", "pending");
      break;
    case "paid":
      query = query.eq("status", "paid");
      break;
    case "unfulfilled":
      query = query.eq("status", "paid").eq("fulfillment_status", "unfulfilled");
      break;
    case "fulfilled":
      query = query.eq("fulfillment_status", "fulfilled");
      break;
    case "shipped":
      query = query.eq("fulfillment_status", "shipped");
      break;
    case "cancelled":
      query = query.or("status.eq.cancelled,fulfillment_status.eq.cancelled");
      break;
    default:
      break;
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = (data ?? []).map((row) => {
    const items = (row.shop_order_items as { quantity?: number; product_image_url?: string }[]) ?? [];
    const serialized = serializeOrder(row);
    return {
      ...serialized,
      shipping_name: (row.shipping_name as string | null) ?? null,
      line_count: items.length,
      unit_count: items.reduce((sum, item) => sum + (item.quantity ?? 0), 0),
      first_product_image_url: resolveStoredProductImageUrl(
        items[0]?.product_image_url ?? null,
      ),
      archived_at: (row.archived_at as string | null) ?? null,
    };
  });

  return NextResponse.json({ orders });
}
