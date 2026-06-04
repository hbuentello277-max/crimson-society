/** Free shipping threshold in cents (matches CartDrawer: $200). */
export const FREE_SHIPPING_THRESHOLD_CENTS = 20_000;

/** Flat shipping rate in cents when below threshold (matches CartDrawer: $12). */
export const FLAT_SHIPPING_CENTS = 1_200;

export function computeShippingCents(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
}
