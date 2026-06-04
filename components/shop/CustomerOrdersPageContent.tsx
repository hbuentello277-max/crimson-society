"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatCentsUsd,
  fulfillmentStatusBadgeClass,
  formatFulfillmentStatusLabel,
  paymentStatusBadgeClass,
  formatOrderStatusLabel,
  shortOrderId,
} from "@/lib/shop/orders";

type OrderListItem = {
  id: string;
  status: string;
  status_label: string;
  fulfillment_status: string;
  fulfillment_status_label: string;
  total_cents: number;
  created_at: string;
  line_count: number;
  unit_count: number;
  first_product_image_url: string | null;
};

export function CustomerOrdersPageContent() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/shop/orders", { credentials: "include" });
        const data = (await res.json()) as { orders?: OrderListItem[]; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not load orders.");
          setOrders([]);
          return;
        }
        setOrders(data.orders ?? []);
      } catch {
        setError("Could not load orders.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <main className="relative min-h-screen bg-[#050405] pb-32 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.4), transparent 58%),
            radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.14), transparent 70%)
          `,
        }}
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            href="/profile"
            className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 hover:text-white"
          >
            ← Profile
          </Link>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Orders</p>
          <Link
            href="/shop"
            className="text-[10px] uppercase tracking-[0.25em] text-[#e87a82]"
          >
            Shop
          </Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-2xl px-5 py-8">
        <h1 className="font-serif text-3xl italic text-white">Your orders</h1>
        <p className="mt-2 text-sm text-zinc-500">Merch purchases from the Crimson Society shop.</p>

        {loading ? <p className="mt-8 text-sm text-zinc-500">Loading orders…</p> : null}
        {error ? (
          <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {!loading && !error && orders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-white/15 p-8 text-center">
            <p className="text-sm text-zinc-500">No orders yet.</p>
            <Link
              href="/shop"
              className="mt-4 inline-block rounded-full border border-[#b4141e]/40 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#e87a82]"
            >
              Browse the shop
            </Link>
          </div>
        ) : null}

        <ul className="mt-8 space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]"
            >
              <div className="flex gap-3 p-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                  {order.first_product_image_url ? (
                    <Image
                      src={order.first_product_image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-xs text-zinc-400">#{shortOrderId(order.id)}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${paymentStatusBadgeClass(order.status)}`}
                    >
                      {formatOrderStatusLabel(order.status)}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${fulfillmentStatusBadgeClass(order.fulfillment_status)}`}
                    >
                      {formatFulfillmentStatusLabel(order.fulfillment_status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(order.created_at).toLocaleDateString()} · {order.line_count} item
                    {order.line_count === 1 ? "" : "s"} · {order.unit_count} unit
                    {order.unit_count === 1 ? "" : "s"}
                  </p>
                  <p className="mt-2 font-serif text-lg italic text-[#e87a82]">
                    {formatCentsUsd(order.total_cents)}
                  </p>
                </div>
              </div>
              <div className="border-t border-white/8 px-3 py-2.5">
                <Link
                  href={`/profile/orders/${order.id}`}
                  className="flex min-h-10 items-center justify-center rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 text-[10px] uppercase tracking-[0.2em] text-[#f1c3c7]"
                >
                  View details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
