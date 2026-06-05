export const SHOP_ORDER_STATUSES = ["pending", "paid", "cancelled", "refunded"] as const;

/** Legacy DB value; treated as paid in UI. */
export const SHOP_ORDER_STATUS_LEGACY_FULFILLED = "fulfilled" as const;

export const SHOP_FULFILLMENT_STATUSES = [
  "unfulfilled",
  "fulfilled",
  "shipped",
  "cancelled",
] as const;

export const SHOP_DELIVERY_METHODS = ["shipping", "local_pickup"] as const;

export const SHOP_ORDER_EMAIL_TYPES = [
  "order_confirmation",
  "ready_for_pickup",
  "shipped",
] as const;

export type ShopOrderEmailType = (typeof SHOP_ORDER_EMAIL_TYPES)[number];

export const SHOP_PICKUP_STATUSES = [
  "not_applicable",
  "pending",
  "ready",
  "picked_up",
  "cancelled",
] as const;

export type ShopOrderStatus = (typeof SHOP_ORDER_STATUSES)[number] | "fulfilled";

export type ShopFulfillmentStatus = (typeof SHOP_FULFILLMENT_STATUSES)[number];

export type ShopDeliveryMethod = (typeof SHOP_DELIVERY_METHODS)[number];

export type ShopPickupStatus = (typeof SHOP_PICKUP_STATUSES)[number];

export type ShopOrderShippingAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

export type ShopOrder = {
  id: string;
  user_id: string | null;
  status: ShopOrderStatus;
  fulfillment_status: ShopFulfillmentStatus;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_phone: string | null;
  shipping_address: ShopOrderShippingAddress | null;
  fulfilled_at: string | null;
  shipped_at: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  tracking_url: string | null;
  admin_fulfillment_note: string | null;
  customer_note: string | null;
  delivery_method: ShopDeliveryMethod;
  pickup_status: ShopPickupStatus;
  pickup_note: string | null;
  pickup_ready_at: string | null;
  picked_up_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ShopOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  size: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  reservation_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ShopOrderWithItems = ShopOrder & {
  shop_order_items: ShopOrderItem[];
};

/** Client cart line sent to checkout validation (no prices). */
export type CheckoutCartItemPayload = {
  product_id: string;
  size: string;
  quantity: number;
};

export function normalizePaymentStatus(status: string): ShopOrderStatus {
  if (status === "fulfilled") return "paid";
  if (isShopOrderStatus(status)) return status;
  return "pending";
}

export function isShopOrderStatus(value: string): value is ShopOrderStatus {
  return (
    (SHOP_ORDER_STATUSES as readonly string[]).includes(value) || value === "fulfilled"
  );
}

export function isShopFulfillmentStatus(value: string): value is ShopFulfillmentStatus {
  return (SHOP_FULFILLMENT_STATUSES as readonly string[]).includes(value);
}

export function isShopDeliveryMethod(value: string): value is ShopDeliveryMethod {
  return (SHOP_DELIVERY_METHODS as readonly string[]).includes(value);
}

export function isShopPickupStatus(value: string): value is ShopPickupStatus {
  return (SHOP_PICKUP_STATUSES as readonly string[]).includes(value);
}

export function formatOrderStatusLabel(status: ShopOrderStatus | string) {
  const normalized = normalizePaymentStatus(status);
  switch (normalized) {
    case "pending":
      return "Pending";
    case "paid":
      return "Paid";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    default:
      return status;
  }
}

export function formatFulfillmentStatusLabel(status: ShopFulfillmentStatus | string) {
  switch (status) {
    case "unfulfilled":
      return "Unfulfilled";
    case "fulfilled":
      return "Fulfilled";
    case "shipped":
      return "Shipped";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function paymentStatusBadgeClass(status: ShopOrderStatus | string) {
  const normalized = normalizePaymentStatus(status);
  switch (normalized) {
    case "pending":
      return "border-amber-500/40 bg-amber-500/15 text-amber-200";
    case "paid":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    case "cancelled":
      return "border-red-500/40 bg-red-500/15 text-red-300";
    case "refunded":
      return "border-zinc-500/40 bg-zinc-500/15 text-zinc-400";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
  }
}

export function fulfillmentStatusBadgeClass(status: ShopFulfillmentStatus | string) {
  switch (status) {
    case "unfulfilled":
      return "border-amber-500/40 bg-amber-500/15 text-amber-200";
    case "fulfilled":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    case "shipped":
      return "border-sky-500/40 bg-sky-500/15 text-sky-200";
    case "cancelled":
      return "border-red-500/40 bg-red-500/15 text-red-300";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
  }
}

export function formatDeliveryMethodLabel(method: ShopDeliveryMethod | string) {
  switch (method) {
    case "local_pickup":
      return "Local Pickup";
    case "shipping":
      return "Shipping";
    default:
      return method;
  }
}

export function formatPickupStatusLabel(status: ShopPickupStatus | string) {
  switch (status) {
    case "not_applicable":
      return "N/A";
    case "pending":
      return "Pickup Pending";
    case "ready":
      return "Ready for Pickup";
    case "picked_up":
      return "Picked Up";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function pickupStatusBadgeClass(status: ShopPickupStatus | string) {
  switch (status) {
    case "pending":
      return "border-amber-500/40 bg-amber-500/15 text-amber-200";
    case "ready":
      return "border-sky-500/40 bg-sky-500/15 text-sky-200";
    case "picked_up":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    case "cancelled":
      return "border-red-500/40 bg-red-500/15 text-red-300";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
  }
}

export function formatCentsUsd(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function shortOrderId(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

export function formatEmailTypeLabel(type: ShopOrderEmailType | string) {
  switch (type) {
    case "order_confirmation":
      return "Order confirmation";
    case "ready_for_pickup":
      return "Ready for pickup";
    case "shipped":
      return "Shipped";
    default:
      return type;
  }
}
