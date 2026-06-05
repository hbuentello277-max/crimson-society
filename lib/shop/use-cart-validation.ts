"use client";

import { useCallback, useEffect, useState } from "react";
import type { CartItem } from "@/lib/cart-store";
import { cartItemKey } from "@/lib/cart-store";
import type { CheckoutCartItemPayload } from "@/lib/shop/orders";
import type { ShopDeliveryMethod } from "@/lib/shop/orders";
import type { CheckoutCartValidationResult } from "@/lib/shop/validate-checkout-cart";

function toPayload(items: CartItem[]): CheckoutCartItemPayload[] {
  return items.map((item) => ({
    product_id: item.productId,
    size: item.size,
    quantity: item.quantity,
  }));
}

export function useCartValidation(
  enabled: boolean,
  items: CartItem[],
  deliveryMethod: ShopDeliveryMethod = "shipping",
) {
  const [validation, setValidation] = useState<CheckoutCartValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!items.length) {
      setValidation(null);
      setNetworkError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNetworkError(null);

    try {
      const res = await fetch("/api/shop/checkout/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: toPayload(items), delivery_method: deliveryMethod }),
      });

      const data = (await res.json()) as CheckoutCartValidationResult | { error?: string };

      if ("error" in data && typeof data.error === "string" && !("items" in data)) {
        setNetworkError(data.error);
        setValidation(null);
        return;
      }

      setValidation(data as CheckoutCartValidationResult);
    } catch {
      setNetworkError("Could not refresh bag prices.");
      setValidation(null);
    } finally {
      setLoading(false);
    }
  }, [items, deliveryMethod]);

  useEffect(() => {
    if (!enabled || items.length === 0) {
      setValidation(null);
      setNetworkError(null);
      setLoading(false);
      return;
    }

    void refresh();
  }, [enabled, items, deliveryMethod, refresh]);

  const lineByKey = new Map(
    (validation?.items ?? []).map((line) => [
      cartItemKey(line.product_id, line.size),
      line,
    ]),
  );

  const errorsByKey = new Map<string, string>();
  for (const err of validation?.errors ?? []) {
    if (!err.product_id) continue;
    const key = cartItemKey(err.product_id, err.size);
    errorsByKey.set(key, err.message);
  }

  return {
    validation,
    loading,
    networkError,
    refresh,
    lineByKey,
    errorsByKey,
    canCheckout: Boolean(validation?.ok && validation.subtotal_cents > 0),
  };
}
