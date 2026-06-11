"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { SizeSelectorButtons } from "@/components/shop/SizeSelectorButtons";
import {
  badgeLabel,
  badgeStyle,
  categoryLabels,
  formatPrice,
  type Product,
} from "@/lib/products";
import { productImageAt } from "@/lib/shop/product-detail-image";
import type { SizeInventoryMap } from "@/lib/shop/inventory";

type Props = {
  product: Product;
  imgIdx: number;
  size: string | null;
  sizeError: boolean;
  showWaitlist: boolean;
  waitlistEmail: string;
  activeDisplaySizes: string[];
  activeSizeMap: SizeInventoryMap | null;
  onClose: () => void;
  onImgIdxChange: (index: number) => void;
  onSizeChange: (size: string) => void;
  onWaitlistEmailChange: (email: string) => void;
  onShowWaitlistChange: (show: boolean) => void;
  onAdd: () => void;
  onWaitlistSubmit: (event: React.FormEvent) => void;
  isWaitlistState: (product: Product) => boolean;
  isComingSoon: (product: Product) => boolean;
};

export default function ShopProductDetailOverlay({
  product,
  imgIdx,
  size,
  sizeError,
  showWaitlist,
  waitlistEmail,
  activeDisplaySizes,
  activeSizeMap,
  onClose,
  onImgIdxChange,
  onSizeChange,
  onWaitlistEmailChange,
  onShowWaitlistChange,
  onAdd,
  onWaitlistSubmit,
  isWaitlistState,
  isComingSoon,
}: Props) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#0a0a0b]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex justify-center pt-3">
            <div className="h-1 w-12 rounded-full bg-white/15" />
          </div>

          <div className="flex items-center justify-between px-5 pt-3">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Detail</p>
            <button
              type="button"
              onClick={onClose}
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
                    src={productImageAt(product.images, imgIdx)}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className={`object-cover object-[center_62%] ${
                      isWaitlistState(product) ? "opacity-60 grayscale" : ""
                    }`}
                  />
                </motion.div>
              </AnimatePresence>

              {(product.badge || product.status === "coming_soon") && (
                <span
                  className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.25em] backdrop-blur ${
                    product.status === "coming_soon"
                      ? "border-white/20 bg-black/80 text-white/70"
                      : badgeStyle(product.badge)
                  }`}
                >
                  {product.status === "coming_soon" ? "Coming Soon" : badgeLabel(product.badge)}
                </span>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {product.images.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => onImgIdxChange(index)}
                    className={`relative h-16 w-16 overflow-hidden rounded-xl border transition ${
                      index === imgIdx
                        ? "border-[#b4141e]"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <Image
                      src={productImageAt(product.images, index)}
                      alt={`${product.name} thumbnail ${index + 1}`}
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
              {categoryLabels[product.category]}
            </p>
            <h2 className="mt-1 font-serif text-3xl italic text-white">{product.name}</h2>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/50">{product.tagline}</p>
            <p className="mt-3 text-xl text-[#e87a82]">{formatPrice(product.price)}</p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/40">Notes</p>
              <p className="text-sm leading-relaxed text-white/80">{product.description}</p>
            </div>

            {!showWaitlist ? (
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
                  >
                    <SizeSelectorButtons
                      sizes={activeDisplaySizes}
                      sizeInventory={activeSizeMap}
                      selected={size}
                      onSelect={onSizeChange}
                      disabled={isWaitlistState(product) || isComingSoon(product)}
                    />
                  </motion.div>
                </div>

                <button
                  type="button"
                  onClick={onAdd}
                  className={`mt-6 w-full rounded-full px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition ${
                    isComingSoon(product)
                      ? "border border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20"
                      : isWaitlistState(product)
                        ? "border border-white/10 bg-black/40 text-white/80 hover:border-[#b4141e]/60 hover:bg-[#b4141e]/10 hover:text-white"
                        : "border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] hover:bg-[#b4141e]/30"
                  }`}
                >
                  {isComingSoon(product)
                    ? "Coming Soon"
                    : isWaitlistState(product)
                      ? "Join the Waitlist"
                      : "Add to Bag"}
                </button>
              </>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={onWaitlistSubmit}
                className="mt-6 rounded-2xl border border-[#b4141e]/40 bg-[#b4141e]/5 p-4"
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#e87a82]">Join the Waitlist</p>
                <p className="mt-1 text-sm text-white/70">
                  Drop your email — we&apos;ll write when it returns.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="email"
                    required
                    value={waitlistEmail}
                    onChange={(event) => onWaitlistEmailChange(event.target.value)}
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
                  onClick={() => onShowWaitlistChange(false)}
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
    </AnimatePresence>
  );
}
