import type { ShopDeliveryMethod } from "@/lib/shop/orders";
import { isShopDeliveryMethod } from "@/lib/shop/orders";

/** Free shipping threshold in cents (matches CartDrawer: $200). */
export const FREE_SHIPPING_THRESHOLD_CENTS = 20_000;

/** Flat shipping rate in cents when below threshold (matches CartDrawer: $12). */
export const FLAT_SHIPPING_CENTS = 1_200;

export function computeShippingCents(
  subtotalCents: number,
  deliveryMethod: ShopDeliveryMethod = "shipping",
): number {
  if (deliveryMethod === "local_pickup") return 0;
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
}

export function parseDeliveryMethod(value: unknown): ShopDeliveryMethod {
  const raw = typeof value === "string" ? value.trim() : "";
  if (isShopDeliveryMethod(raw)) return raw;
  return "shipping";
}
