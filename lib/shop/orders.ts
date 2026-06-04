export const SHOP_ORDER_STATUSES = [
  "pending",
  "paid",
  "fulfilled",
  "cancelled",
  "refunded",
] as const;

export type ShopOrderStatus = (typeof SHOP_ORDER_STATUSES)[number];

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

export function isShopOrderStatus(value: string): value is ShopOrderStatus {
  return (SHOP_ORDER_STATUSES as readonly string[]).includes(value);
}

export function formatOrderStatusLabel(status: ShopOrderStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "paid":
      return "Paid";
    case "fulfilled":
      return "Fulfilled";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
  }
}

export function formatCentsUsd(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
