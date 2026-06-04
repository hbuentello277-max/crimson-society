"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  formatCentsUsd,
  formatOrderStatusLabel,
  type ShopOrderStatus,
  type ShopOrderWithItems,
} from "@/lib/shop/orders";

function statusBadgeClass(status: ShopOrderStatus) {
  switch (status) {
    case "pending":
      return "border-amber-500/35 bg-amber-500/10 text-amber-200";
    case "paid":
      return "border-sky-500/35 bg-sky-500/10 text-sky-200";
    case "fulfilled":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
    case "cancelled":
      return "border-zinc-500/35 bg-zinc-500/10 text-zinc-400";
    case "refunded":
      return "border-red-500/35 bg-red-500/10 text-red-300";
  }
}

export function AdminOrdersTab() {
  const [orders, setOrders] = useState<ShopOrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("shop_orders")
        .select("*, shop_order_items(*)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (fetchError) {
        setError(fetchError.message);
        setOrders([]);
      } else {
        setOrders((data as ShopOrderWithItems[]) ?? []);
      }

      setLoading(false);
    }

    void load();
  }, []);

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Merch orders</p>
          <p className="mt-1 text-sm text-zinc-500">
            Paid checkout and fulfillment will connect in a later phase.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.7fr_0.9fr] gap-2 border-b border-white/10 px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
          <span>Order</span>
          <span>Customer</span>
          <span>Items</span>
          <span>Total</span>
          <span>Status</span>
          <span>Date</span>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-sm text-zinc-500">Loading orders…</p>
        ) : error ? (
          <p className="px-4 py-8 text-sm text-red-300">{error}</p>
        ) : orders.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="font-serif text-lg italic text-zinc-400">No orders yet</p>
            <p className="mt-2 text-sm text-zinc-600">
              Merch checkout will create orders here once payment is enabled.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/8">
            {orders.map((order) => {
              const itemCount = order.shop_order_items?.length ?? 0;
              const qty = order.shop_order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
              return (
                <li
                  key={order.id}
                  className="grid grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.7fr_0.9fr] gap-2 px-4 py-3 text-sm text-zinc-300"
                >
                  <span className="truncate font-mono text-xs text-zinc-400">
                    {order.id.slice(0, 8)}…
                  </span>
                  <span className="truncate text-xs" title={order.user_id ?? undefined}>
                    {order.shipping_email ??
                      (order.user_id ? `${order.user_id.slice(0, 8)}…` : "Guest")}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {itemCount} line{itemCount === 1 ? "" : "s"} · {qty} unit{qty === 1 ? "" : "s"}
                  </span>
                  <span className="text-[#e87a82]">{formatCentsUsd(order.total_cents)}</span>
                  <span>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${statusBadgeClass(order.status)}`}
                    >
                      {formatOrderStatusLabel(order.status)}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
