import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActiveAdminUserIds } from "@/lib/admin/admin-user-ids";
import { shopOrderGroupKey } from "@/lib/notifications/grouping";
import {
  formatCentsUsd,
  formatDeliveryMethodLabel,
  shortOrderId,
} from "@/lib/shop/orders";
import { pickupReadyNotificationBody } from "@/lib/shop/pickup-settings";
import { loadLocalPickupSettings } from "@/lib/shop/shop-settings-db";

type OrderNotificationRow = {
  id: string;
  user_id: string | null;
  total_cents: number;
  delivery_method: string;
  pickup_note?: string | null;
};

function customerOrderUrl(orderId: string) {
  return `/profile/orders/${orderId}`;
}

function adminOrderUrl(orderId: string) {
  return `/admin/shop?tab=orders&order=${orderId}`;
}

async function loadOrder(admin: SupabaseClient, orderId: string): Promise<OrderNotificationRow | null> {
  const { data, error } = await admin
    .from("shop_orders")
    .select("id, user_id, total_cents, delivery_method, pickup_note")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    console.warn("[shop-notify] order load failed", orderId, error?.message);
    return null;
  }

  return data as OrderNotificationRow;
}

async function insertNotifications(
  admin: SupabaseClient,
  rows: Array<{
    user_id: string;
    type: string;
    title: string;
    body: string;
    target_url: string;
    notification_group_key: string;
  }>,
) {
  if (rows.length === 0) return { inserted: 0, error: null as string | null };

  for (const row of rows) {
    const { error } = await admin.rpc("upsert_grouped_notification", {
      p_user_id: row.user_id,
      p_type: row.type,
      p_title: row.title,
      p_body: row.body,
      p_notification_group_key: row.notification_group_key,
      p_actor_id: null,
      p_ride_id: null,
      p_conversation_id: null,
      p_post_id: null,
      p_comment_id: null,
      p_deletion_request_id: null,
      p_target_url: row.target_url,
      p_destination_url: row.target_url,
      p_metadata: {},
      p_preview_text: row.body,
      p_grouped_body_template: null,
    });

    if (error) {
      console.error("[shop-notify] upsert failed", error.message, error.code);
      return { inserted: 0, error: error.message };
    }
  }

  return { inserted: rows.length, error: null };
}

function deliveryShortLabel(deliveryMethod: string) {
  return deliveryMethod === "local_pickup" ? "Local Pickup" : "Shipping";
}

/** Notify all active admin/owner accounts about a paid order. */
export async function notifyShopOrderPaidAdmins(admin: SupabaseClient, orderId: string) {
  const order = await loadOrder(admin, orderId);
  if (!order) return { ok: false, reason: "order_not_found" as const };

  const shortId = shortOrderId(orderId);
  const total = formatCentsUsd(order.total_cents);
  const delivery = deliveryShortLabel(order.delivery_method);
  const deliveryLong = formatDeliveryMethodLabel(order.delivery_method);

  const adminIds = await loadActiveAdminUserIds(admin);
  if (adminIds.length === 0) {
    console.warn("[shop-notify] no active admin profiles found for shop_order_paid");
    return { ok: false, reason: "no_admins" as const };
  }

  const rows: Array<{
    user_id: string;
    type: string;
    title: string;
    body: string;
    target_url: string;
    notification_group_key: string;
  }> = [];

  for (const adminId of adminIds) {
    rows.push({
      user_id: adminId,
      type: "shop_order_paid",
      title: "New shop order",
      body: `New order #${shortId} · ${total} · ${delivery}`,
      target_url: adminOrderUrl(orderId),
      notification_group_key: shopOrderGroupKey(orderId, adminId),
    });
  }

  const result = await insertNotifications(admin, rows);
  if (result.error) {
    return { ok: false, reason: "insert_failed" as const, error: result.error };
  }

  if (result.inserted === 0 && rows.length === 0) {
    return { ok: true, reason: "already_notified" as const, delivery: deliveryLong };
  }

  return { ok: true, inserted: result.inserted, delivery: deliveryLong };
}

async function notifyShopOrderConfirmedCustomer(admin: SupabaseClient, orderId: string) {
  const order = await loadOrder(admin, orderId);
  if (!order?.user_id) return;

  const shortId = shortOrderId(orderId);
  await insertNotifications(admin, [
    {
      user_id: order.user_id,
      type: "shop_order_confirmed",
      title: "Order confirmed",
      body: `Your Crimson Society order #${shortId} is confirmed.`,
      target_url: customerOrderUrl(orderId),
      notification_group_key: shopOrderGroupKey(orderId, order.user_id),
    },
  ]);
}

/** Notify admins and the customer when an order is paid. */
export async function notifyShopOrderPaid(admin: SupabaseClient, orderId: string) {
  const adminResult = await notifyShopOrderPaidAdmins(admin, orderId);
  await notifyShopOrderConfirmedCustomer(admin, orderId);
  return adminResult;
}

/** Backfill admin notifications for paid orders (e.g. webhook retry path). */
export async function ensureShopOrderPaidAdminNotifications(
  admin: SupabaseClient,
  orderId: string,
) {
  return notifyShopOrderPaidAdmins(admin, orderId);
}

export async function notifyShopOrderReadyForPickup(admin: SupabaseClient, orderId: string) {
  const order = await loadOrder(admin, orderId);
  if (!order?.user_id) return;

  const shortId = shortOrderId(orderId);
  const pickupSettings = await loadLocalPickupSettings(admin);
  const body = pickupReadyNotificationBody(shortId, pickupSettings, order.pickup_note);

  await insertNotifications(admin, [
    {
      user_id: order.user_id,
      type: "shop_order_ready_for_pickup",
      title: "Ready for pickup",
      body,
      target_url: customerOrderUrl(orderId),
      notification_group_key: shopOrderGroupKey(orderId, order.user_id),
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
      notification_group_key: shopOrderGroupKey(orderId, order.user_id),
    },
  ]);
}
