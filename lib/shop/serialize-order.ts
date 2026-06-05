import type {
  ShopDeliveryMethod,
  ShopFulfillmentStatus,
  ShopOrder,
  ShopOrderItem,
  ShopOrderWithItems,
  ShopPickupStatus,
} from "@/lib/shop/orders";
import {
  formatDeliveryMethodLabel,
  formatFulfillmentStatusLabel,
  formatOrderStatusLabel,
  formatPickupStatusLabel,
  isShopDeliveryMethod,
  isShopFulfillmentStatus,
  isShopPickupStatus,
  normalizePaymentStatus,
} from "@/lib/shop/orders";

type DbOrder = Record<string, unknown> & {
  shop_order_items?: DbOrderItem[];
};

type DbOrderItem = Record<string, unknown>;

export function serializeOrderItem(row: DbOrderItem) {
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    product_id: String(row.product_id),
    product_name: String(row.product_name),
    product_image_url: (row.product_image_url as string | null) ?? null,
    size: (row.size as string | null) ?? null,
    quantity: Number(row.quantity) || 0,
    unit_price_cents: Number(row.unit_price_cents) || 0,
    line_total_cents: Number(row.line_total_cents) || 0,
    reservation_id: (row.reservation_id as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export function serializeOrder(row: DbOrder, includeItems = false) {
  const fulfillmentRaw = String(row.fulfillment_status ?? "unfulfilled");
  const fulfillment_status: ShopFulfillmentStatus = isShopFulfillmentStatus(fulfillmentRaw)
    ? fulfillmentRaw
    : "unfulfilled";

  const status = normalizePaymentStatus(String(row.status ?? "pending"));

  const deliveryRaw = String(row.delivery_method ?? "shipping");
  const delivery_method: ShopDeliveryMethod = isShopDeliveryMethod(deliveryRaw)
    ? deliveryRaw
    : "shipping";

  const pickupRaw = String(row.pickup_status ?? "not_applicable");
  const pickup_status: ShopPickupStatus = isShopPickupStatus(pickupRaw)
    ? pickupRaw
    : "not_applicable";

  const base = {
    id: String(row.id),
    user_id: (row.user_id as string | null) ?? null,
    status,
    status_label: formatOrderStatusLabel(status),
    fulfillment_status,
    fulfillment_status_label: formatFulfillmentStatusLabel(fulfillment_status),
    subtotal_cents: Number(row.subtotal_cents) || 0,
    shipping_cents: Number(row.shipping_cents) || 0,
    total_cents: Number(row.total_cents) || 0,
    currency: String(row.currency ?? "usd"),
    shipping_email: (row.shipping_email as string | null) ?? null,
    fulfilled_at: (row.fulfilled_at as string | null) ?? null,
    shipped_at: (row.shipped_at as string | null) ?? null,
    tracking_number: (row.tracking_number as string | null) ?? null,
    tracking_carrier: (row.tracking_carrier as string | null) ?? null,
    tracking_url: (row.tracking_url as string | null) ?? null,
    customer_note: (row.customer_note as string | null) ?? null,
    delivery_method,
    delivery_method_label: formatDeliveryMethodLabel(delivery_method),
    pickup_status,
    pickup_status_label: formatPickupStatusLabel(pickup_status),
    pickup_note: (row.pickup_note as string | null) ?? null,
    pickup_ready_at: (row.pickup_ready_at as string | null) ?? null,
    picked_up_at: (row.picked_up_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };

  if (!includeItems) {
    return base;
  }

  const items = (row.shop_order_items ?? []).map(serializeOrderItem);
  const unit_count = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    ...base,
    items,
    line_count: items.length,
    unit_count,
    first_product_image_url: items[0]?.product_image_url ?? null,
  };
}

export function toShopOrderWithItems(row: DbOrder): ShopOrderWithItems {
  const items = (row.shop_order_items ?? []).map(serializeOrderItem) as ShopOrderItem[];
  const fulfillmentRaw = String(row.fulfillment_status ?? "unfulfilled");

  return {
    id: String(row.id),
    user_id: (row.user_id as string | null) ?? null,
    status: normalizePaymentStatus(String(row.status ?? "pending")),
    fulfillment_status: isShopFulfillmentStatus(fulfillmentRaw)
      ? fulfillmentRaw
      : "unfulfilled",
    subtotal_cents: Number(row.subtotal_cents) || 0,
    shipping_cents: Number(row.shipping_cents) || 0,
    total_cents: Number(row.total_cents) || 0,
    currency: String(row.currency ?? "usd"),
    stripe_checkout_session_id: (row.stripe_checkout_session_id as string | null) ?? null,
    stripe_payment_intent_id: (row.stripe_payment_intent_id as string | null) ?? null,
    shipping_name: (row.shipping_name as string | null) ?? null,
    shipping_email: (row.shipping_email as string | null) ?? null,
    shipping_phone: (row.shipping_phone as string | null) ?? null,
    shipping_address: (row.shipping_address as ShopOrder["shipping_address"]) ?? null,
    fulfilled_at: (row.fulfilled_at as string | null) ?? null,
    shipped_at: (row.shipped_at as string | null) ?? null,
    tracking_number: (row.tracking_number as string | null) ?? null,
    tracking_carrier: (row.tracking_carrier as string | null) ?? null,
    tracking_url: (row.tracking_url as string | null) ?? null,
    admin_fulfillment_note: (row.admin_fulfillment_note as string | null) ?? null,
    customer_note: (row.customer_note as string | null) ?? null,
    delivery_method: isShopDeliveryMethod(String(row.delivery_method ?? "shipping"))
      ? (row.delivery_method as ShopDeliveryMethod)
      : "shipping",
    pickup_status: isShopPickupStatus(String(row.pickup_status ?? "not_applicable"))
      ? (row.pickup_status as ShopPickupStatus)
      : "not_applicable",
    pickup_note: (row.pickup_note as string | null) ?? null,
    pickup_ready_at: (row.pickup_ready_at as string | null) ?? null,
    picked_up_at: (row.picked_up_at as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    shop_order_items: items,
  };
}
