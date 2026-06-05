import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatCentsUsd,
  shortOrderId,
} from "@/lib/shop/orders";

type OrderNotificationRow = {
  id: string;
  user_id: string | null;
  total_cents: number;
  delivery_method: string;
};

function customerOrderUrl(orderId: string) {
  return `/profile/orders/${orderId}`;
}

function adminOrdersUrl() {
  return "/admin/shop?tab=orders";
}

async function loadOrder(admin: SupabaseClient, orderId: string): Promise<OrderNotificationRow | null> {
  const { data, error } = await admin
    .from("shop_orders")
    .select("id, user_id, total_cents, delivery_method")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    console.warn("[shop-notify] order load failed", orderId, error?.message);
    return null;
  }

  return data as OrderNotificationRow;
}

async function loadAdminUserIds(admin: SupabaseClient, excludeUserId?: string | null) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("status", "active")
    .or("is_admin.eq.true,role.eq.admin");

  if (error) {
    console.warn("[shop-notify] admin load failed", error.message);
    return [] as string[];
  }

  return (data ?? [])
    .map((row) => row.id as string)
    .filter((id) => id && id !== excludeUserId);
}

async function insertNotifications(
  admin: SupabaseClient,
  rows: Array<{
    user_id: string;
    type: string;
    title: string;
    body: string;
    target_url: string;
  }>,
) {
  if (rows.length === 0) return;

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    console.warn("[shop-notify] insert failed", error.message);
  }
}

function deliveryShortLabel(deliveryMethod: string) {
  return deliveryMethod === "local_pickup" ? "Pickup" : "Shipping";
}

/** Notify admins and the customer when an order is paid. */
export async function notifyShopOrderPaid(admin: SupabaseClient, orderId: string) {
  const order = await loadOrder(admin, orderId);
  if (!order) return;

  const shortId = shortOrderId(orderId);
  const total = formatCentsUsd(order.total_cents);
  const delivery = deliveryShortLabel(order.delivery_method);

  const adminIds = await loadAdminUserIds(admin, order.user_id);
  const adminRows = adminIds.map((adminId) => ({
    user_id: adminId,
    type: "shop_order_paid",
    title: "New shop order",
    body: `New order #${shortId} · ${total} · ${delivery}`,
    target_url: adminOrdersUrl(),
  }));

  await insertNotifications(admin, adminRows);

  if (order.user_id) {
    await insertNotifications(admin, [
      {
        user_id: order.user_id,
        type: "shop_order_confirmed",
        title: "Order confirmed",
        body: `Your Crimson Society order #${shortId} is confirmed.`,
        target_url: customerOrderUrl(orderId),
      },
    ]);
  }
}

export async function notifyShopOrderReadyForPickup(admin: SupabaseClient, orderId: string) {
  const order = await loadOrder(admin, orderId);
  if (!order?.user_id) return;

  const shortId = shortOrderId(orderId);
  await insertNotifications(admin, [
    {
      user_id: order.user_id,
      type: "shop_order_ready_for_pickup",
      title: "Ready for pickup",
      body: `Your order #${shortId} is ready for pickup.`,
      target_url: customerOrderUrl(orderId),
    },
  ]);
}

export async function notifyShopOrderShipped(admin: SupabaseClient, orderId: string) {
  const order = await loadOrder(admin, orderId);
  if (!order?.user_id) return;

  const shortId = shortOrderId(orderId);
  await insertNotifications(admin, [
    {
      user_id: order.user_id,
      type: "shop_order_shipped",
      title: "Your order has shipped",
      body: `Your order #${shortId} is on the move.`,
      target_url: customerOrderUrl(orderId),
    },
  ]);
}
