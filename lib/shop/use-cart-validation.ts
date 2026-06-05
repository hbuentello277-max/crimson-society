"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CartItem } from "@/lib/cart-store";
import { cartItemKey } from "@/lib/cart-store";
import type { CheckoutCartItemPayload, ShopDeliveryMethod } from "@/lib/shop/orders";
import type { CheckoutCartValidationResult } from "@/lib/shop/validate-checkout-cart";

function toPayload(items: CartItem[]): CheckoutCartItemPayload[] {
  return items.map((item) => ({
    product_id: item.productId,
    size: item.size,
    quantity: item.quantity,
  }));
}

function cartFingerprint(items: CartItem[]) {
  return items.map((item) => `${item.productId}|${item.size}|${item.quantity}`).join(",");
}

export function useCartValidation(
  enabled: boolean,
  items: CartItem[],
  deliveryMethod: ShopDeliveryMethod = "shipping",
) {
  const [validation, setValidation] = useState<CheckoutCartValidationResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const fingerprint = useMemo(() => cartFingerprint(items), [items]);

  const refresh = useCallback(async () => {
    const currentItems = itemsRef.current;

    if (!currentItems.length) {
      setValidation(null);
      setNetworkError(null);
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    setNetworkError(null);

    try {
      const res = await fetch("/api/shop/checkout/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: toPayload(currentItems),
          delivery_method: deliveryMethod,
        }),
      });

      const data = (await res.json()) as CheckoutCartValidationResult | { error?: string };

      if ("items" in data && Array.isArray(data.items)) {
        setValidation(data);
        return;
      }

      if ("error" in data && typeof data.error === "string") {
        setNetworkError(data.error);
        return;
      }

      setNetworkError("Could not refresh bag prices.");
    } catch {
      setNetworkError("Could not refresh bag prices.");
    } finally {
      setRefreshing(false);
    }
  }, [deliveryMethod]);

  useEffect(() => {
    if (!enabled || !fingerprint) {
      setValidation(null);
      setNetworkError(null);
      setRefreshing(false);
      return;
    }

    void refresh();
  }, [enabled, fingerprint, deliveryMethod, refresh]);

  const lineByKey = useMemo(
    () =>
      new Map(
        (validation?.items ?? []).map((line) => [
          cartItemKey(line.product_id, line.size),
          line,
        ]),
      ),
    [validation],
  );

  const errorsByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const err of validation?.errors ?? []) {
      if (!err.product_id) continue;
      map.set(cartItemKey(err.product_id, err.size), err.message);
    }
    return map;
  }, [validation]);

  const canCheckout = Boolean(
    validation &&
      validation.subtotal_cents > 0 &&
      validation.items.length === items.length &&
      validation.errors.length === 0,
  );

  return {
    validation,
    refreshing,
    initialLoading: refreshing && !validation,
    networkError,
    refresh,
    lineByKey,
    errorsByKey,
    canCheckout,
  };
}
