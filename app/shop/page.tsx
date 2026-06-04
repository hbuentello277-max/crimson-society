"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShopCreditRewardsPanel } from "@/components/shop/ShopCreditRewardsPanel";
import {
  Category,
  Product,
  badgeLabel,
  badgeStyle,
  categoryLabels,
  formatPrice,
  fetchMerchProducts,
} from "@/lib/products";
import { getSizeAvailable, isSizePurchasable, parseSizeInventory } from "@/lib/shop/inventory";
import { useCart, useCartCount } from "@/lib/cart-store";
import { CS_SHOP_BAG_BTN } from "@/lib/crimson-accent";

type SortKey = "featured" | "newest" | "price-low" | "price-high";

type ShopTab = "merch" | "credit-rewards";

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#050405] px-5 py-20 text-sm text-zinc-500">Loading shop…</main>
      }
    >
      <ShopPageInner />
    </Suspense>
  );
}

function ShopPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopTab: ShopTab =
    searchParams.get("tab") === "credit-rewards" ? "credit-rewards" : "merch";
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [active, setActive] = useState<Product | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [productList, setProductList] = useState<Product[]>([]);

  const cartCount = useCartCount();
  const addItem = useCart((s) => s.addItem);
  const openDrawer = useCart((s) => s.openDrawer);
  const joinWaitlist = useCart((s) => s.joinWaitlist);
  const showToast = useCart((s) => s.showToast);
  const drawerOpen = useCart((s) => s.drawerOpen);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setErrorMsg("");

      try {
        const data = await fetchMerchProducts();
        setProductList(data);
      } catch (error: unknown) {
        setErrorMsg(error instanceof Error ? error.message : "Failed to load products.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    const timer = window.setTimeout(() => {
      setActive(null);
      setShowWaitlist(false);
      setSizeError(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [drawerOpen]);

  const filtered = useMemo(() => {
    let list = [...productList];

    if (category !== "all") {
      list = list.filter((p) => p.category === category);
    }

    if (sort === "newest") {
      list = [...list].sort((a, b) => {
        if (a.badge === "new" && b.badge !== "new") return -1;
        if (a.badge !== "new" && b.badge === "new") return 1;
        return 0;
      });
    }

    if (sort === "price-low") {
      list = [...list].sort((a, b) => a.price - b.price);
    }

    if (sort === "price-high") {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [category, sort, productList]);

  const openProduct = (p: Product) => {
    setActive(p);
    setImgIdx(0);
    setSize(null);
    setShowWaitlist(false);
    setWaitlistEmail("");
    setSizeError(false);
  };

  const closeProduct = () => {
    setActive(null);
    setShowWaitlist(false);
    setSizeError(false);
  };

  const isWaitlistState = (product: Product) =>
    product.status === "out_of_stock" || product.status === "waitlist";

  const isComingSoon = (product: Product) => product.status === "coming_soon";

  const activeSizeMap = active ? parseSizeInventory(active.size_inventory) : null;

  const isSizeOutOfStock = (product: Product, sizeLabel: string) => {
    const map = parseSizeInventory(product.size_inventory);
    if (!map) return false;
    return !isSizePurchasable(map, sizeLabel);
  };

  const handleAdd = () => {
    if (!active) return;

    if (isComingSoon(active)) {
      showToast("Coming soon", "This piece has not been released yet");
      return;
    }

    if (isWaitlistState(active)) {
      setShowWaitlist(true);
      return;
    }

    if (!size) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 1400);
      return;
    }

    if (isSizeOutOfStock(active, size)) {
      showToast("Out of stock", `Size ${size} is not available`);
      return;
    }

    addItem(active.id, size, active.name);
    closeProduct();
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !waitlistEmail.trim()) return;

    joinWaitlist(active.id, waitlistEmail.trim());
    showToast("Added to the waitlist", "We'll write when it returns");
    closeProduct();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] pb-32 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%),
            radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.16), transparent 70%),
            linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 32%)
          `,
        }}
      />

      <header className="sticky top-0 pt-[calc(env(safe-area-inset-top)+14px)] z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="w-[72px]" />

            {shopTab === "merch" ? (
              <button type="button" onClick={openDrawer} className={CS_SHOP_BAG_BTN}>
                <span>Bag</span>
                <span className="text-[10px] opacity-60">·</span>
                <motion.span
                  key={cartCount}
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 20 }}
                  className="tabular-nums"
                >
                  {cartCount}
                </motion.span>
              </button>
            ) : (
              <div className="w-[72px]" />
            )}
          </div>

          <div className="mt-10 text-center">
            <div className="mx-auto flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-white/20" />
              <span className="text-xl text-[#b4141e]">✦</span>
              <span className="h-px w-12 bg-white/20" />
            </div>

            <h1 className="mt-6 font-serif text-7xl leading-none text-white">
              Shop
            </h1>

            <p className="mt-4 font-serif italic text-3xl text-[#e87a82]">
              Outfitter
            </p>

            <p className="mx-auto mt-3 max-w-xl text-xs uppercase tracking-[0.28em] text-white/50">
              {shopTab === "merch"
                ? "Limited pieces · Crimson Society issue · Hand-finished drop"
                : "Redeem credits for stickers, gear, discounts & more"}
            </p>
          </div>

          <div className="mx-auto mt-8 flex max-w-xs justify-center gap-2">
            {(
              [
                { id: "merch" as const, label: "Merch" },
                { id: "credit-rewards" as const, label: "Credit Rewards" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  router.push(tab.id === "credit-rewards" ? "/shop?tab=credit-rewards" : "/shop")
                }
                className={`rounded-full border px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] transition ${
                  shopTab === tab.id
                    ? "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]"
                    : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {shopTab === "merch" ? (
          <div className="mt-10">
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
              {(Object.keys(categoryLabels) as Category[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex-shrink-0 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition ${
                    category === c
                      ? "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]"
                      : "border-white/10 text-zinc-500 hover:border-white/30 hover:text-zinc-300"
                  }`}
                >
                  {categoryLabels[c]}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                {filtered.length} piece{filtered.length === 1 ? "" : "s"}
              </p>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Sort
                </span>

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white outline-none hover:border-white/30"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price · Low</option>
                  <option value="price-high">Price · High</option>
                </select>
              </div>
            </div>
          </div>
          ) : null}
        </div>
      </header>

      {shopTab === "credit-rewards" ? (
        <section className="relative mx-auto max-w-2xl px-5 pt-8 pb-16">
          <ShopCreditRewardsPanel />
        </section>
      ) : null}

      {shopTab === "merch" ? (
      <>
      <section className="relative mx-auto max-w-2xl px-5 pt-10">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]">
          <div className="relative aspect-[16/10] w-full">
            <Image
              src="/silent-movement-san-antonio.png"
              alt="Silent Movement artwork"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain object-center opacity-70"
            />
          </div>

          <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 backdrop-blur-sm">
            <p className="text-[9px] uppercase tracking-[0.32em] text-[#e87a82]">
              SILENT MOVEMENT
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-8 flex justify-center px-5">
            <div className="max-w-md rounded-2xl bg-gradient-to-t from-black/60 via-black/30 to-transparent px-5 pb-4 pt-8 text-center">
            <p className="mt-6 text-[9px] uppercase tracking-[0.22em] text-white/45">                Eight pieces · Hand-finished · Limited run
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-6 max-w-2xl px-5">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/70">
            Loading shop…
          </div>
        ) : errorMsg ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
            {errorMsg}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
                        <p className="font-serif text-2xl italic text-white">COMING SOON</p>
            <p className="mt-3 max-w-sm text-center text-sm text-zinc-400">
              Exclusive pieces. Limited runs. Stay tuned.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            {filtered.map((p) => (
              <motion.button
                key={p.id}
                type="button"
                layout
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                onClick={() => openProduct(p)}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] text-left transition hover:border-[#b4141e]/40 hover:shadow-[0_0_25px_rgba(180,20,30,0.18)]"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
                  <Image
                    src={
                      p.images[0] ||
                      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800"
                    }
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 320px"
                    className={`object-cover object-[center_62%] transition duration-500 group-hover:scale-105 ${
                      isWaitlistState(p) ? "opacity-50 grayscale" : ""
                    }`}
                  />

                  {(p.badge || p.status === "coming_soon") && (
                    <span
                      className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.25em] backdrop-blur ${
                        p.status === "coming_soon"
                          ? "border-white/20 bg-black/80 text-white/70"
                          : badgeStyle(p.badge)
                      }`}
                    >
                      {p.status === "coming_soon" ? "Coming Soon" : badgeLabel(p.badge)}
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <p className="truncate font-serif text-base italic text-white">{p.name}</p>
                  <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.2em] text-white/45">
                    {p.tagline}
                  </p>
                  <p className="mt-2 text-sm text-[#e87a82]">{formatPrice(p.price)}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        <div className="mt-12 flex items-center justify-center gap-3 text-white/30">
          <div className="h-px w-12 bg-white/15" />
          <span className="text-xs">✦</span>
          <div className="h-px w-12 bg-white/15" />
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.4em] text-white/30">
          © Crimson Society · MMXXVI
        </p>
      </section>
      </>
      ) : null}

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md"
            onClick={closeProduct}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 32 }}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#0a0a0b]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3">
                <div className="h-1 w-12 rounded-full bg-white/15" />
              </div>

              <div className="flex items-center justify-between px-5 pt-3">
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
                  Detail
                </p>

                <button
                  type="button"
                  onClick={closeProduct}
                  className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:bg-white/5"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 px-5">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={imgIdx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={
                          active.images[imgIdx] ||
                          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800"
                        }
                        alt={active.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 768px"
                        className={`object-cover object-[center_62%] ${
                          isWaitlistState(active) ? "opacity-60 grayscale" : ""
                        }`}
                      />
                    </motion.div>
                  </AnimatePresence>

                  {(active.badge || active.status === "coming_soon") && (
                    <span
                      className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.25em] backdrop-blur ${
                        active.status === "coming_soon"
                          ? "border-white/20 bg-black/80 text-white/70"
                          : badgeStyle(active.badge)
                      }`}
                    >
                      {active.status === "coming_soon"
                        ? "Coming Soon"
                        : badgeLabel(active.badge)}
                    </span>
                  )}
                </div>

                {active.images.length > 1 && (
                  <div className="mt-3 flex gap-2">
                    {active.images.map((src, i) => (
                      <button
                        key={`${src}-${i}`}
                        type="button"
                        onClick={() => setImgIdx(i)}
                        className={`relative h-16 w-16 overflow-hidden rounded-xl border transition ${
                          i === imgIdx
                            ? "border-[#b4141e]"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <Image
                          src={src}
                          alt={`${active.name} thumbnail ${i + 1}`}
                          fill
                          sizes="64px"
                          className="object-cover object-[center_62%]"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 py-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  {categoryLabels[active.category]}
                </p>

                <h2 className="mt-1 font-serif text-3xl italic text-white">
                  {active.name}
                </h2>

                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/50">
                  {active.tagline}
                </p>

                <p className="mt-3 text-xl text-[#e87a82]">{formatPrice(active.price)}</p>

                <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/40">
                    Notes
                  </p>
                  <p className="text-sm leading-relaxed text-white/80">
                    {active.description}
                  </p>
                </div>

                {!showWaitlist && (
                  <>
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <p
                          className={`text-[10px] uppercase tracking-[0.3em] transition ${
                            sizeError ? "text-[#e87a82]" : "text-white/40"
                          }`}
                        >
                          {sizeError ? "Pick a size first" : "Size"}
                        </p>

                        <button
                          type="button"
                          className="text-[10px] uppercase tracking-[0.25em] text-[#e87a82]"
                        >
                          Size Guide
                        </button>
                      </div>

                      <motion.div
                        animate={sizeError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-wrap gap-2"
                      >
                        {active.sizes.map((s) => {
                          const sizeOos =
                            isWaitlistState(active) ||
                            isComingSoon(active) ||
                            isSizeOutOfStock(active, s);
                          const available = activeSizeMap
                            ? getSizeAvailable(activeSizeMap, s)
                            : null;

                          return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setSize(s);
                              setSizeError(false);
                            }}
                            disabled={sizeOos}
                            className={`min-w-[3rem] rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.2em] transition ${
                              size === s
                                ? "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]"
                                : "border-white/10 bg-black/30 text-white/70 hover:border-white/30"
                            } ${sizeOos ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                          >
                            {s}
                            {available != null && available < 10 ? (
                              <span className="ml-1 text-[8px] opacity-70">({available})</span>
                            ) : null}
                          </button>
                          );
                        })}
                      </motion.div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAdd}
                      className={`mt-6 w-full rounded-full px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition ${
                        isComingSoon(active)
                          ? "border border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20"
                          : isWaitlistState(active)
                          ? "border border-white/10 bg-black/40 text-white/80 hover:border-[#b4141e]/60 hover:bg-[#b4141e]/10 hover:text-white"
                          : "border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] hover:bg-[#b4141e]/30"
                      }`}
                    >
                      {isComingSoon(active)
                        ? "Coming Soon"
                        : isWaitlistState(active)
                        ? "Join the Waitlist"
                        : "Add to Bag"}
                    </button>
                  </>
                )}

                {showWaitlist && (
                  <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleWaitlistSubmit}
                    className="mt-6 rounded-2xl border border-[#b4141e]/40 bg-[#b4141e]/5 p-4"
                  >
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#e87a82]">
                      Join the Waitlist
                    </p>

                    <p className="mt-1 text-sm text-white/70">
                      Drop your email — we&apos;ll write when it returns.
                    </p>

                    <div className="mt-3 flex gap-2">
                      <input
                        type="email"
                        required
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#b4141e]/60"
                      />

                      <button
                        type="submit"
                        className="rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] text-[#e87a82] transition hover:bg-[#b4141e]/30"
                      >
                        Notify
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowWaitlist(false)}
                      className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white/40 hover:text-white"
                    >
                      ← Back
                    </button>
                  </motion.form>
                )}

                <p className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-white/35">
                  Free shipping over $200 · Members get 15% off
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
