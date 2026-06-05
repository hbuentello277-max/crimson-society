import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import {
  buildAdminOrderUpdateRow,
  sanitizeAdminShopOrderPatch,
} from "@/lib/shop/admin-order-patch";
import { serializeOrder } from "@/lib/shop/serialize-order";

const ORDER_SELECT =
  "id, user_id, status, fulfillment_status, delivery_method, pickup_status, subtotal_cents, shipping_cents, total_cents, currency, shipping_email, shipping_name, fulfilled_at, shipped_at, tracking_number, tracking_carrier, tracking_url, admin_fulfillment_note, customer_note, pickup_note, pickup_ready_at, picked_up_at, created_at, updated_at, shop_order_items(id, order_id, product_id, product_name, product_image_url, size, quantity, unit_price_cents, line_total_cents, created_at)";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  const orderId = id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const admin = createAdminServiceClient();
  const { data, error } = await admin
    .from("shop_orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = serializeOrder(data, true);
  return NextResponse.json({
    order: {
      ...order,
      shipping_name: (data.shipping_name as string | null) ?? null,
      admin_fulfillment_note: (data.admin_fulfillment_note as string | null) ?? null,
      pickup_note: (data.pickup_note as string | null) ?? null,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  const orderId = id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let patch;
  try {
    patch = sanitizeAdminShopOrderPatch(body);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid patch" },
      { status: 400 },
    );
  }

  const admin = createAdminServiceClient();

  const { data: existing, error: loadError } = await admin
    .from("shop_orders")
    .select(
      "id, fulfilled_at, shipped_at, pickup_ready_at, picked_up_at, fulfillment_status, admin_fulfillment_note, customer_note, tracking_carrier, tracking_number, tracking_url",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updateRow = buildAdminOrderUpdateRow(patch, {
    fulfilled_at: existing.fulfilled_at as string | null,
    shipped_at: existing.shipped_at as string | null,
    pickup_ready_at: existing.pickup_ready_at as string | null,
    picked_up_at: existing.picked_up_at as string | null,
  });

  const { data: updated, error: updateError } = await admin
    .from("shop_orders")
    .update(updateRow)
    .eq("id", orderId)
    .select(ORDER_SELECT)
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const order = serializeOrder(updated, true);
  return NextResponse.json({
    order: {
      ...order,
      shipping_name: (updated.shipping_name as string | null) ?? null,
      admin_fulfillment_note: (updated.admin_fulfillment_note as string | null) ?? null,
      pickup_note: (updated.pickup_note as string | null) ?? null,
    },
  });
}
