"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/products";

type SavedOrder = {
  orderId: string;
  total: number;
  form: { name: string; email: string };
};

export default function CheckoutSuccessPage() {
  const [order, setOrder] = useState<SavedOrder | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("cs-last-order");
      if (raw) setOrder(JSON.parse(raw));
    } catch {}
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-5 pb-32 pt-10 text-white">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="flex h-20 w-20 items-center justify-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/10 text-3xl text-[#e87a82] shadow-[0_0_45px_rgba(180,20,30,0.4)]"
      >
        ✓
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-6 max-w-md text-center"
      >
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">Confirmed</p>
        <h1 className="mt-2 font-serif text-4xl italic leading-tight text-white">
          Welcome to the Society.
        </h1>
        <p className="mt-3 text-sm text-white/65">
          Your order has been received. We hand-press every piece — expect a shipping confirmation
          within 48 hours.
        </p>
      </motion.div>

      {order && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Order</span>
            <span className="font-mono text-sm text-white">#{order.orderId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Total</span>
            <span className="font-serif text-xl italic text-[#e87a82]">
              {formatPrice(order.total)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Receipt</span>
            <span className="truncate text-sm text-white">{order.form.email}</span>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="mt-8 flex flex-col gap-2"
      >
        <Link
          href="/shop"
          className="rounded-full bg-[#b4141e] px-6 py-3 text-center text-xs uppercase tracking-[0.3em] text-white shadow-[0_0_25px_rgba(180,20,30,0.4)] hover:bg-[#d11827]"
        >
          Keep Shopping
        </Link>
        <Link
          href="/dashboard"
          className="text-center text-[11px] uppercase tracking-[0.3em] text-white/45 hover:text-white"
        >
          Back to the Feed
        </Link>
      </motion.div>

      <div className="mt-12 flex items-center justify-center gap-3 text-white/30">
        <div className="h-px w-12 bg-white/15" />
        <span className="text-xs">✦</span>
        <div className="h-px w-12 bg-white/15" />
      </div>
      <p className="mt-4 text-center text-[10px] uppercase tracking-[0.4em] text-white/30">
        © Crimson Society · MMXXVI
      </p>
    </main>
  );
}