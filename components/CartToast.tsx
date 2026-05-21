"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";

export default function CartToast() {
  const toast = useCart((s) => s.toast);
  const hideToast = useCart((s) => s.hideToast);
  const openDrawer = useCart((s) => s.openDrawer);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => hideToast(), 2600);
    return () => clearTimeout(t);
  }, [toast, hideToast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ y: 60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-24 left-1/2 z-[80] -translate-x-1/2"
        >
          <button
            onClick={() => {
              hideToast();
              openDrawer();
            }}
            className="flex items-center gap-3 rounded-full border border-[#b4141e]/50 bg-[#0a0a0b]/95 px-5 py-3 shadow-[0_0_35px_rgba(180,20,30,0.45)] backdrop-blur-xl transition hover:border-[#b4141e]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b4141e] text-xs text-white">
              ✓
            </span>
            <div className="text-left">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white">{toast.title}</p>
              {toast.subtitle && (
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.3em] text-white/45">
                  {toast.subtitle} · View bag →
                </p>
              )}
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}