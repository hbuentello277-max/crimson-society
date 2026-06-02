"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart, useCartItems } from "@/lib/cart-store";
import { Product, fetchProducts, formatPrice } from "@/lib/products";

export default function CartDrawer() {
  const router = useRouter();
  const open = useCart((s) => s.drawerOpen);
  const closeDrawer = useCart((s) => s.closeDrawer);
  const items = useCartItems();
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const removeItem = useCart((s) => s.removeItem);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (error) {
        console.error("Failed to load cart products:", error);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const productMap = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const enrichedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      product: productMap.get(item.productId) ?? null,
    }));
  }, [items, productMap]);

  const subtotal = enrichedItems.reduce((sum, item) => {
    return sum + ((item.product?.price || 0) * item.quantity);
  }, 0);

  const shipping = subtotal === 0 ? 0 : subtotal >= 200 ? 0 : 12;
  const total = subtotal + shipping;

  const goCheckout = () => {
    closeDrawer();
    router.push("/checkout");
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
            className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#050505] text-white shadow-[-30px_0_60px_rgba(0,0,0,0.7)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-[#050505] px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">Your</p>
                <h2 className="font-serif text-3xl italic text-white">Bag</h2>
              </div>
              <button
                onClick={closeDrawer}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:border-[#b4141e]/60 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#050505] px-6 py-5">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/40 text-2xl text-white/40">
                    ◇
                  </div>
                  <p className="font-serif text-2xl italic text-white">Empty as the open road.</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-white/40">
                    Nothing in your bag yet
                  </p>
                  <button
                    onClick={closeDrawer}
                    className="mt-6 rounded-full border border-[#b4141e]/40 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#e87a82] hover:bg-[#b4141e]/10"
                  >
                    Keep Shopping
                  </button>
                </div>
              ) : loadingProducts ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                  Loading your bag...
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {enrichedItems.map((item) => {
                      const p = item.product;
                      if (!p) return null;

                      const lineTotal = p.price * item.quantity;

                      return (
                        <motion.div
                          key={item.key}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 40 }}
                          transition={{ type: "spring", stiffness: 280, damping: 28 }}
                          className="flex gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-3"
                        >
                          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-white/10">
                            <Image
                              src={
                                p.images[0] ||
                                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800"
                              }
                              alt={p.name}
                              fill
                              className="object-cover"
                            />
                          </div>

                          <div className="flex flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-serif text-base italic text-white">
                                  {p.name}
                                </p>
                                <p className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-white/45">
                                  Size {item.size}
                                </p>
                              </div>

                              <button
                                onClick={() => removeItem(item.key)}
                                className="text-[10px] uppercase tracking-[0.25em] text-white/40 hover:text-[#e87a82]"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="mt-auto flex items-center justify-between pt-2">
                              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-0.5">
                                <button
                                  onClick={() => decrement(item.key)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:bg-white/5 hover:text-white"
                                  aria-label="Decrease"
                                >
                                  −
                                </button>

                                <span className="min-w-[1.5rem] text-center text-xs text-white">
                                  {item.quantity}
                                </span>

                                <button
                                  onClick={() => increment(item.key)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:bg-white/5 hover:text-white"
                                  aria-label="Increase"
                                >
                                  +
                                </button>
                              </div>

                              <p className="text-sm text-[#e87a82]">{formatPrice(lineTotal)}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-white/10 bg-[#070707] px-6 py-5">
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between text-white/70">
                    <span>Subtotal</span>
                    <span className="text-white">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/70">
                    <span>Shipping</span>
                    <span className="text-white">
                      {shipping === 0 ? "Free" : formatPrice(shipping)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                    Total
                  </span>
                  <span className="font-serif text-2xl italic text-[#e87a82]">
                    {formatPrice(total)}
                  </span>
                </div>

                {subtotal < 200 && (
                  <p className="mt-3 text-center text-[10px] uppercase tracking-[0.3em] text-white/40">
                    Add {formatPrice(200 - subtotal)} more for free shipping
                  </p>
                )}

                <button
                  onClick={goCheckout}
                  className="mt-4 w-full rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-6 py-3.5 text-xs uppercase tracking-[0.3em] text-[#e87a82] transition hover:bg-[#b4141e]/30"
                >
                  Checkout
                </button>

                <button
                  onClick={closeDrawer}
                  className="mt-2 block w-full text-center text-[11px] uppercase tracking-[0.3em] text-white/45 hover:text-white"
                >
                  Continue Browsing
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}