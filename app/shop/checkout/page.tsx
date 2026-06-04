"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, useCartItems } from "@/lib/cart-store";
import { formatCentsUsd } from "@/lib/shop/orders";
import type { CheckoutCartItemPayload } from "@/lib/shop/orders";
import type { CheckoutCartValidationResult } from "@/lib/shop/validate-checkout-cart";

export default function ShopCheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#050405] px-5 py-20 text-sm text-zinc-500">
          Loading checkout…
        </main>
      }
    >
      <ShopCheckoutPageInner />
    </Suspense>
  );
}

function ShopCheckoutPageInner() {
  const router = useRouter();
  const cartItems = useCartItems();
  const clearCart = useCart((s) => s.clear);

  const [validation, setValidation] = useState<CheckoutCartValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const runValidation = useCallback(async (items: CheckoutCartItemPayload[]) => {
    setLoading(true);
    setNetworkError(null);

    try {
      const res = await fetch("/api/shop/checkout/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = (await res.json()) as CheckoutCartValidationResult | { error?: string };

      if (!res.ok && "error" in data && typeof data.error === "string") {
        setNetworkError(data.error);
        setValidation(null);
        return;
      }

      setValidation(data as CheckoutCartValidationResult);
    } catch {
      setNetworkError("Could not validate your bag. Try again.");
      setValidation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const payload: CheckoutCartItemPayload[] = cartItems.map((item) => ({
      product_id: item.productId,
      size: item.size,
      quantity: item.quantity,
    }));

    if (payload.length === 0) {
      setValidation(null);
      setLoading(false);
      return;
    }

    void runValidation(payload);
  }, [cartItems, runValidation]);

  const isEmpty = cartItems.length === 0;

  return (
    <main className="relative min-h-screen bg-[#050405] pb-32 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%),
            radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.16), transparent 70%)
          `,
        }}
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={() => router.push("/shop")}
            className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 hover:text-white"
          >
            ← Shop
          </button>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Checkout</p>
          <div className="w-12" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="font-serif text-3xl italic text-white">Review your bag</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Payment is not enabled yet. This page validates inventory and totals from the server.
        </p>

        {isEmpty ? (
          <div className="mt-10 rounded-2xl border border-dashed border-white/15 p-8 text-center">
            <p className="text-sm text-zinc-500">Your bag is empty.</p>
            <Link
              href="/shop"
              className="mt-4 inline-block rounded-full border border-[#b4141e]/40 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#e87a82]"
            >
              Continue shopping
            </Link>
          </div>
        ) : null}

        {!isEmpty && loading ? (
          <p className="mt-8 text-sm text-zinc-500">Validating items…</p>
        ) : null}

        {networkError ? (
          <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {networkError}
          </p>
        ) : null}

        {!isEmpty && validation && !loading ? (
          <>
            {validation.errors.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-red-300">
                  Fix these before checkout
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-red-200">
                  {validation.errors.map((err, i) => (
                    <li key={`${err.product_id}-${err.size}-${err.code}-${i}`}>{err.message}</li>
                  ))}
                </ul>
                <Link
                  href="/shop"
                  className="mt-4 inline-block text-[10px] uppercase tracking-[0.2em] text-[#e87a82] underline-offset-2 hover:underline"
                >
                  Back to shop
                </Link>
              </div>
            ) : null}

            <ul className="mt-8 space-y-3">
              {validation.items.map((line) => (
                <li
                  key={`${line.product_id}-${line.size}`}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-3"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                    {line.product_image_url ? (
                      <Image
                        src={line.product_image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base italic text-white">{line.product_name}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      Size {line.size} · Qty {line.quantity}
                    </p>
                    {line.available != null && line.available < 10 ? (
                      <p className="mt-1 text-[10px] text-amber-300/90">
                        {line.available} left in this size
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-[#e87a82]">
                      {formatCentsUsd(line.line_total_cents)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal</span>
                <span className="text-white">{formatCentsUsd(validation.subtotal_cents)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm text-zinc-400">
                <span>Shipping (estimate)</span>
                <span className="text-white">
                  {validation.shipping_cents === 0
                    ? "Free"
                    : formatCentsUsd(validation.shipping_cents)}
                </span>
              </div>
              <div className="mt-3 flex justify-between border-t border-white/10 pt-3">
                <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Total</span>
                <span className="font-serif text-2xl italic text-[#e87a82]">
                  {formatCentsUsd(validation.total_cents)}
                </span>
              </div>
              {validation.subtotal_cents > 0 &&
              validation.subtotal_cents < 20_000 &&
              validation.shipping_cents > 0 ? (
                <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  Add {formatCentsUsd(20_000 - validation.subtotal_cents)} more for free shipping
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <span
                className={`h-2 w-2 rounded-full ${
                  validation.ok ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              {validation.ok
                ? "Inventory validated — ready for payment (coming soon)"
                : "Some items need attention"}
            </div>

            <button
              type="button"
              disabled
              className="mt-6 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-6 py-3.5 text-xs uppercase tracking-[0.3em] text-zinc-500"
            >
              Continue to payment — coming soon
            </button>

            <button
              type="button"
              onClick={() => {
                clearCart();
                router.push("/shop");
              }}
              className="mt-3 w-full text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400"
            >
              Clear bag
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}
