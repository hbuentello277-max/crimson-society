"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart, useCartItems } from "@/lib/cart-store";
import { formatCentsUsd } from "@/lib/shop/orders";
import { resolveProductImageUrl } from "@/lib/shop/product-image-url";
import { useCartValidation } from "@/lib/shop/use-cart-validation";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shop/shipping";
import { fetchMerchProducts, type Product } from "@/lib/products";

function lineImageUrl(line: {
  product_image_url?: string | null;
  image_display_url?: string | null;
  image_thumbnail_url?: string | null;
}) {
  return (
    line.image_display_url ??
    line.image_thumbnail_url ??
    line.product_image_url ??
    null
  );
}

export default function CartDrawer() {
  const router = useRouter();
  const open = useCart((s) => s.drawerOpen);
  const closeDrawer = useCart((s) => s.closeDrawer);
  const items = useCartItems();
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const removeItem = useCart((s) => s.removeItem);

  const {
    validation,
    refreshing,
    initialLoading,
    networkError,
    refresh,
    lineByKey,
    errorsByKey,
    canCheckout,
  } = useCartValidation(open, items, "shipping");

  const [productCatalog, setProductCatalog] = useState<Map<string, Product>>(new Map());

  useEffect(() => {
    if (!open || items.length === 0) return;

    let cancelled = false;

    async function loadCatalog() {
      try {
        const products = await fetchMerchProducts();
        if (cancelled) return;
        setProductCatalog(new Map(products.map((product) => [product.id, product])));
      } catch {
        // Catalog is a display fallback only; validation remains authoritative for pricing.
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [open, items.length]);

  const imageByProductId = useMemo(() => {
    const map = new Map<string, string>();

    for (const product of productCatalog.values()) {
      const url = resolveProductImageUrl(product.images);
      if (url) map.set(product.id, url);
    }

    for (const line of validation?.items ?? []) {
      const url = lineImageUrl(line);
      if (url) map.set(line.product_id, url);
    }

    return map;
  }, [productCatalog, validation]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const subtotalCents = validation?.subtotal_cents ?? 0;
  const shippingCents = validation?.shipping_cents ?? 0;
  const totalCents = validation?.total_cents ?? 0;

  const goCheckout = () => {
    if (!canCheckout) return;
    closeDrawer();
    router.push("/shop/checkout");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-[100] bg-black/85"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed right-0 top-0 z-[101] flex h-[100dvh] w-full max-w-md flex-col border-l border-white/10 bg-[#050505] text-white shadow-[-30px_0_60px_rgba(0,0,0,0.7)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#050505] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="min-w-0 pr-3">
                <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">Your</p>
                <h2 className="font-serif text-3xl italic text-white">Bag</h2>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-lg text-white/70 hover:border-[#b4141e]/60 hover:text-white"
                aria-label="Close bag"
              >
                ✕
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto bg-[#050505] px-5 py-4">
                {items.length === 0 ? (
                  <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/40 text-2xl text-white/40">
                      ◇
                    </div>
                    <p className="font-serif text-2xl italic text-white">Empty as the open road.</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-white/40">
                      Nothing in your bag yet
                    </p>
                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="mt-6 rounded-full border border-[#b4141e]/40 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#e87a82] hover:bg-[#b4141e]/10"
                    >
                      Keep Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {initialLoading ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                        Refreshing prices…
                      </div>
                    ) : null}

                    {networkError ? (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                        {networkError}
                        <button
                          type="button"
                          onClick={() => void refresh()}
                          className="mt-2 block text-[10px] uppercase tracking-[0.2em] text-[#e87a82]"
                        >
                          Retry
                        </button>
                      </div>
                    ) : null}

                    <AnimatePresence initial={false}>
                      {items.map((item) => {
                        const line = lineByKey.get(item.key);
                        const lineError = errorsByKey.get(item.key);
                        const unitCents =
                          line?.unit_price_cents ?? item.unitPriceCents ?? 0;
                        const lineTotalCents =
                          line?.line_total_cents ?? unitCents * item.quantity;
                        const imageUrl =
                          (line ? lineImageUrl(line) : null) ??
                          imageByProductId.get(item.productId) ??
                          null;

                        return (
                          <motion.div
                            key={item.key}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 40 }}
                            transition={{ type: "spring", stiffness: 280, damping: 28 }}
                            className={`flex gap-3 rounded-2xl border p-3 ${
                              lineError
                                ? "border-amber-500/35 bg-amber-500/5"
                                : "border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]"
                            }`}
                          >
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-black/50 text-white/20">
                                  ◇
                                </div>
                              )}
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate font-serif text-base italic text-white">
                                    {line?.product_name ??
                                      productCatalog.get(item.productId)?.name ??
                                      "Item"}
                                  </p>
                                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-white/45">
                                    Size {item.size}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeItem(item.key)}
                                  className="shrink-0 text-[10px] uppercase tracking-[0.25em] text-white/40 hover:text-[#e87a82]"
                                >
                                  Remove
                                </button>
                              </div>

                              {lineError ? (
                                <p className="mt-2 text-xs text-amber-200">{lineError}</p>
                              ) : null}

                              <div className="mt-auto flex items-center justify-between pt-2">
                                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => decrement(item.key)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/5 hover:text-white"
                                    aria-label="Decrease"
                                  >
                                    −
                                  </button>
                                  <span className="min-w-[1.5rem] text-center text-xs text-white">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => increment(item.key)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/5 hover:text-white"
                                    aria-label="Increase"
                                  >
                                    +
                                  </button>
                                </div>

                                <p className="text-sm text-[#e87a82]">
                                  {formatCentsUsd(lineTotalCents)}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {validation && !canCheckout && validation.errors.length > 0 ? (
                      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-amber-300/90">
                        Fix bag issues before checkout
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void refresh()}
                      disabled={refreshing}
                      className="w-full text-center text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                    >
                      {refreshing ? "Refreshing…" : "Refresh bag"}
                    </button>
                  </div>
                )}
              </div>

              {items.length > 0 ? (
                <div className="shrink-0 border-t border-white/10 bg-[#070707] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between text-white/70">
                      <span>Subtotal</span>
                      <span className="text-white">{formatCentsUsd(subtotalCents)}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/70">
                      <span>Shipping (estimate)</span>
                      <span className="text-white">
                        {shippingCents === 0 ? "Free" : formatCentsUsd(shippingCents)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                      Total
                    </span>
                    <span className="font-serif text-2xl italic text-[#e87a82]">
                      {formatCentsUsd(totalCents)}
                    </span>
                  </div>

                  {subtotalCents > 0 &&
                  subtotalCents < FREE_SHIPPING_THRESHOLD_CENTS &&
                  shippingCents > 0 ? (
                    <p className="mt-3 text-center text-[10px] uppercase tracking-[0.3em] text-white/40">
                      Add {formatCentsUsd(FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents)} more
                      for free shipping
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={goCheckout}
                    disabled={!canCheckout}
                    className="mt-4 w-full rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-6 py-3.5 text-xs uppercase tracking-[0.3em] text-[#e87a82] transition hover:bg-[#b4141e]/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Checkout
                  </button>

                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="mt-2 block w-full text-center text-[11px] uppercase tracking-[0.3em] text-white/45 hover:text-white"
                  >
                    Continue Browsing
                  </button>
                </div>
              ) : null}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
