"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShopProductImage } from "@/components/shop/ShopProductImage";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart, useCartItems } from "@/lib/cart-store";
import { supabase } from "@/lib/supabase";
import { formatCentsUsd, type ShopDeliveryMethod } from "@/lib/shop/orders";
import type { CheckoutCartItemPayload } from "@/lib/shop/orders";
import type { CheckoutCartValidationResult } from "@/lib/shop/validate-checkout-cart";
import { resolveLineImageUrl } from "@/lib/shop/product-image-url";
import { PickupLocationCard } from "@/components/shop/PickupLocationCard";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/crimson-accent";
import { openExternalUrl } from "@/lib/checkout/open-external-url";

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
  const searchParams = useSearchParams();
  const cartItems = useCartItems();
  const clearCart = useCart((s) => s.clear);

  const [validation, setValidation] = useState<CheckoutCartValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<ShopDeliveryMethod>("shipping");
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const cancelHandledRef = useRef(false);

  const cancelled = searchParams.get("cancelled") === "1";
  const cancelOrderId = searchParams.get("order")?.trim() ?? "";

  useEffect(() => {
    async function loadAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthUserId(user?.id ?? null);
      setAuthChecked(true);
    }
    void loadAuth();
  }, []);

  useEffect(() => {
    if (!cancelled || !cancelOrderId || cancelHandledRef.current) return;
    cancelHandledRef.current = true;

    async function handleCancel() {
      try {
        const res = await fetch("/api/shop/checkout/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderId: cancelOrderId }),
        });
        if (res.ok) {
          setCancelMessage("Checkout cancelled. Your items were released.");
        }
      } catch {
        setCancelMessage("Checkout cancelled.");
      }
      router.replace("/shop/checkout", { scroll: false });
    }

    void handleCancel();
  }, [cancelled, cancelOrderId, router]);

  const runValidation = useCallback(
    async (items: CheckoutCartItemPayload[], method: ShopDeliveryMethod) => {
    setLoading(true);
    setNetworkError(null);

    try {
      const res = await fetch("/api/shop/checkout/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, delivery_method: method }),
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
  },
    [],
  );

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

    void runValidation(payload, deliveryMethod);
  }, [cartItems, deliveryMethod, runValidation]);

  async function handleContinueToPayment() {
    if (!validation?.ok || !authUserId) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    const items: CheckoutCartItemPayload[] = cartItems.map((item) => ({
      product_id: item.productId,
      size: item.size,
      quantity: item.quantity,
    }));

    try {
      const res = await fetch("/api/shop/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items, delivery_method: deliveryMethod }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setCheckoutError(data.error ?? "Could not start checkout.");
        setCheckoutLoading(false);
        return;
      }

      await openExternalUrl(data.url);
    } catch {
      setCheckoutError("Could not start checkout. Try again.");
      setCheckoutLoading(false);
    }
  }

  const isEmpty = cartItems.length === 0;

  return (
    <main className={`relative min-h-screen bg-[#050405] text-white ${BOTTOM_NAV_CLEARANCE}`}>
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
          Inventory is held for 15 minutes once you continue to payment.
        </p>

        {cancelMessage ? (
          <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {cancelMessage}
          </p>
        ) : null}

        {authChecked && !authUserId ? (
          <div className="mt-6 rounded-2xl border border-[#b4141e]/30 bg-[#b4141e]/10 px-4 py-4">
            <p className="text-sm text-[#f1c3c7]">Sign in to complete your purchase.</p>
            <Link
              href="/login"
              className="mt-3 inline-block text-[10px] uppercase tracking-[0.2em] text-[#e87a82] underline-offset-2 hover:underline"
            >
              Log in
            </Link>
          </div>
        ) : null}

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

        {checkoutError ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {checkoutError}
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
              {validation.items.map((line) => {
                const imageUrl = resolveLineImageUrl(line);
                return (
                <li
                  key={`${line.product_id}-${line.size}`}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-3"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                    {imageUrl ? (
                      <ShopProductImage src={imageUrl} alt="" />
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
                );
              })}
            </ul>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Delivery</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("shipping")}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                    deliveryMethod === "shipping"
                      ? "border-[#b4141e]/50 bg-[#b4141e]/10 text-[#f1c3c7]"
                      : "border-white/10 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <span className="block text-[10px] uppercase tracking-[0.18em]">Ship to me</span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Standard shipping · address at payment
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("local_pickup")}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                    deliveryMethod === "local_pickup"
                      ? "border-[#b4141e]/50 bg-[#b4141e]/10 text-[#f1c3c7]"
                      : "border-white/10 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <span className="block text-[10px] uppercase tracking-[0.18em]">
                    Local pickup
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">No shipping charge</span>
                </button>
              </div>
              {deliveryMethod === "local_pickup" ? (
                <PickupLocationCard mode="preview" className="mt-4" />
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal</span>
                <span className="text-white">{formatCentsUsd(validation.subtotal_cents)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm text-zinc-400">
                <span>
                  {deliveryMethod === "local_pickup" ? "Pickup" : "Shipping (estimate)"}
                </span>
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
              {deliveryMethod === "shipping" &&
              validation.subtotal_cents > 0 &&
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
                ? "Inventory validated — ready for payment"
                : "Some items need attention"}
            </div>

            <button
              type="button"
              disabled={
                !validation.ok ||
                !authUserId ||
                checkoutLoading ||
                validation.errors.length > 0
              }
              onClick={() => void handleContinueToPayment()}
              className="mt-6 w-full rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-6 py-3.5 text-xs uppercase tracking-[0.3em] text-[#e87a82] transition hover:bg-[#b4141e]/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkoutLoading ? "Starting checkout…" : "Continue to payment"}
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
