"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Category,
  Product,
  badgeLabel,
  badgeStyle,
  categoryLabels,
  formatPrice,
  fetchProducts,
} from "@/lib/products";
import { useCart, useCartCount } from "@/lib/cart-store";

type SortKey = "featured" | "newest" | "price-low" | "price-high";

export default function ShopPage() {
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
        const data = await fetchProducts();
        setProductList(data);
      } catch (error: any) {
        setErrorMsg(error.message || "Failed to load products.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      setActive(null);
      setShowWaitlist(false);
      setSizeError(false);
    }
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

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="w-[72px]" />

            <button
              type="button"
              onClick={openDrawer}
              className="relative flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/80 transition hover:border-[#b4141e]/60 hover:text-white"
            >
              <span>Bag</span>
              <span className="text-[10px] text-white/50">·</span>

              <motion.span
                key={cartCount}
                initial={{ scale: 1.4, color: "#ffffff" }}
                animate={{ scale: 1, color: "#e87a82" }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
              >
                {cartCount}
              </motion.span>

              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#b4141e] text-[9px] text-white shadow-[0_0_10px_rgba(180,20,30,0.6)]"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>
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
              Limited pieces · Crimson Society issue · Hand-finished drop
            </p>
          </div>

          <div className="mt-10">
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
              {(Object.keys(categoryLabels) as Category[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex-shrink-0 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition ${
                    category === c
                      ? "border-[#b4141e] bg-[#b4141e] text-white shadow-[0_0_18px_rgba(180,20,30,0.35)]"
                      : "border-white/10 bg-black/30 text-white/55 hover:text-white"
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
        </div>
      </header>

      <section className="relative mx-auto max-w-2xl px-5 pt-10">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]">
          <div className="relative aspect-[16/10] w-full">
            <Image
              src="/silent-movement-san-antonio.png"
              alt="Silent Movement First Drop artwork"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain object-center opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/35 to-transparent" />
          </div>

          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">
              Spring Drop · 26
            </p>
            <h2 className="mt-1 font-serif text-3xl italic leading-tight text-white">
              The Long Shadow
            </h2>
            <p className="mt-2 max-w-md text-xs uppercase tracking-[0.25em] text-white/60">
              Eight pieces · Hand-finished · Limited run
            </p>
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
            <p className="font-serif text-2xl italic text-white">No pieces here yet.</p>
            <p className="mt-2 text-sm text-white/50">
              Add products from the admin shop panel and they’ll appear here.
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
                        {active.sizes.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setSize(s);
                              setSizeError(false);
                            }}
                            disabled={isWaitlistState(active) || isComingSoon(active)}
                            className={`min-w-[3rem] rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.2em] transition ${
                              size === s
                                ? "border-[#b4141e] bg-[#b4141e]/15 text-white shadow-[0_0_12px_rgba(180,20,30,0.3)]"
                                : "border-white/10 bg-black/30 text-white/70 hover:border-white/30"
                            } ${
                              isWaitlistState(active) || isComingSoon(active)
                                ? "cursor-not-allowed opacity-40"
                                : ""
                            }`}
                          >
                            {s}
                          </button>
                        ))}
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
                          : "bg-[#b4141e] text-white shadow-[0_0_25px_rgba(180,20,30,0.4)] hover:bg-[#d11827]"
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
                        className="rounded-full bg-[#b4141e] px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] text-white hover:bg-[#d11827]"
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
