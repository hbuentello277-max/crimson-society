export const SHOP_PAYMENT_CHECKOUT_TYPES = ["merch", "reward_cash"] as const;

export type ShopPaymentCheckoutType = (typeof SHOP_PAYMENT_CHECKOUT_TYPES)[number];

export function isShopPaymentCheckoutType(value: string | null | undefined) {
  return value === "merch" || value === "reward_cash";
}
