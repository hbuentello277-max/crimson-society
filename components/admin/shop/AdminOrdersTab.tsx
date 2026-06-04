"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminOrderDetailPanel } from "@/components/admin/shop/AdminOrderDetailPanel";
import {
  formatCentsUsd,
  formatFulfillmentStatusLabel,
  formatOrderStatusLabel,
  fulfillmentStatusBadgeClass,
  paymentStatusBadgeClass,
  shortOrderId,
} from "@/lib/shop/orders";

type OrderFilter = "all" | "paid" | "unfulfilled" | "fulfilled" | "shipped" | "cancelled";

type AdminOrderRow = {
  id: string;
  status: string;
  fulfillment_status: string;
  total_cents: number;
  shipping_email: string | null;
  shipping_name: string | null;
  created_at: string;
  line_count: number;
  unit_count: number;
};

const FILTERS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "unfulfilled", label: "Unfulfilled" },
  { id: "fulfilled", label: "Fulfilled" },
  { id: "shipped", label: "Shipped" },
  { id: "cancelled", label: "Cancelled" },
];

export function AdminOrdersTab() {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shop/orders?filter=${filter}`);
      const data = (await res.json()) as { orders?: AdminOrderRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load orders");
        setOrders([]);
        return;
      }
      setOrders(data.orders ?? []);
    } catch {
      setError("Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Merch orders</p>
          <p className="mt-1 text-sm text-zinc-500">Payment and fulfillment status for shop checkout.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
              filter === f.id
                ? "border border-[#b4141e]/50 bg-[#b4141e]/15 text-[#f1c3c7]"
                : "border border-white/10 text-zinc-500 hover:border-white/25"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[0.9fr_1fr_0.7fr_0.6fr_0.75fr_0.75fr_0.85fr_0.7fr] gap-2 border-b border-white/10 px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
            <span>Order</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Total</span>
            <span>Payment</span>
            <span>Fulfillment</span>
            <span>Date</span>
            <span />
          </div>

          {loading ? (
            <p className="px-4 py-8 text-sm text-zinc-500">Loading orders…</p>
          ) : error ? (
            <p className="px-4 py-8 text-sm text-red-300">{error}</p>
          ) : orders.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-serif text-lg italic text-zinc-400">No orders in this view</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/8">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="grid grid-cols-[0.9fr_1fr_0.7fr_0.6fr_0.75fr_0.75fr_0.85fr_0.7fr] gap-2 px-4 py-3 text-sm text-zinc-300"
                >
                  <span className="font-mono text-xs text-zinc-400">
                    #{shortOrderId(order.id)}
                  </span>
                  <span className="truncate text-xs" title={order.shipping_email ?? undefined}>
                    {order.shipping_email ??
                      order.shipping_name ??
                      "—"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {order.line_count} / {order.unit_count}
                  </span>
                  <span className="text-[#e87a82]">{formatCentsUsd(order.total_cents)}</span>
                  <span>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${paymentStatusBadgeClass(order.status)}`}
                    >
                      {formatOrderStatusLabel(order.status)}
                    </span>
                  </span>
                  <span>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${fulfillmentStatusBadgeClass(order.fulfillment_status)}`}
                    >
                      {formatFulfillmentStatusLabel(order.fulfillment_status)}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                  <span>
                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className="text-[9px] uppercase tracking-[0.14em] text-[#e87a82] hover:text-[#f1c3c7]"
                    >
                      Manage
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AdminOrderDetailPanel
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onUpdated={() => void loadOrders()}
      />
    </div>
  );
}
