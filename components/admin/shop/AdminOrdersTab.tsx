"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminOrderDetailPanel } from "@/components/admin/shop/AdminOrderDetailPanel";
import {
  formatCentsUsd,
  formatDeliveryMethodLabel,
  formatFulfillmentStatusLabel,
  formatOrderStatusLabel,
  formatPickupStatusLabel,
  fulfillmentStatusBadgeClass,
  paymentStatusBadgeClass,
  pickupStatusBadgeClass,
  shortOrderId,
} from "@/lib/shop/orders";

type OrderFilter =
  | "all"
  | "pending"
  | "paid"
  | "unfulfilled"
  | "fulfilled"
  | "shipped"
  | "cancelled";

type VisibilityFilter = "active" | "archived" | "all";

type AdminOrderRow = {
  id: string;
  status: string;
  fulfillment_status: string;
  delivery_method: string;
  pickup_status: string;
  total_cents: number;
  shipping_email: string | null;
  shipping_name: string | null;
  created_at: string;
  line_count: number;
  unit_count: number;
  archived_at?: string | null;
};

const STATUS_FILTERS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
  { id: "unfulfilled", label: "Unfulfilled" },
  { id: "fulfilled", label: "Fulfilled" },
  { id: "shipped", label: "Shipped" },
  { id: "cancelled", label: "Cancelled" },
];

const VISIBILITY_FILTERS: { id: VisibilityFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All records" },
];

export function AdminOrdersTab() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [visibility, setVisibility] = useState<VisibilityFilter>("active");
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const orderParam = searchParams.get("order")?.trim();
    if (orderParam) {
      setSelectedOrderId(orderParam);
    }
  }, [searchParams]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/shop/orders?filter=${filter}&visibility=${visibility}`,
      );
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
  }, [filter, visibility]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-2xl border border-[#b4141e]/25 bg-[#b4141e]/5 p-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Fulfillment queue</p>
        <h2 className="mt-2 font-serif text-2xl italic text-white">Shop orders</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          This is where you ship and deliver merch. Paid orders appear here — use{" "}
          <span className="text-zinc-300">Unfulfilled</span> for orders waiting to pack/ship,{" "}
          <span className="text-zinc-300">Local Pickup</span> rows for pickup status, and{" "}
          <span className="text-zinc-300">Manage</span> to update tracking or archive test orders.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
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

        <div className="flex flex-wrap gap-2">
          {VISIBILITY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setVisibility(f.id)}
              className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
                visibility === f.id
                  ? "border border-white/25 bg-white/10 text-white"
                  : "border border-white/10 text-zinc-600 hover:border-white/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[0.9fr_1.1fr_0.6fr_0.55fr_0.75fr_0.7fr_0.75fr_0.85fr_0.7fr] gap-2 border-b border-white/10 px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
            <span>Order #</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Total</span>
            <span>Delivery</span>
            <span>Payment</span>
            <span>Fulfillment</span>
            <span>Placed</span>
            <span>Action</span>
          </div>

          {loading ? (
            <p className="px-4 py-8 text-sm text-zinc-500">Loading orders…</p>
          ) : error ? (
            <p className="px-4 py-8 text-sm text-red-300">{error}</p>
          ) : orders.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-serif text-lg italic text-zinc-400">No orders in this view</p>
              <p className="mt-2 text-sm text-zinc-600">
                Try a different filter, or check Archived for hidden test orders.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/8">
              {orders.map((order) => {
                const customerLabel =
                  order.shipping_name && order.shipping_email
                    ? `${order.shipping_name} · ${order.shipping_email}`
                    : order.shipping_email ?? order.shipping_name ?? "—";

                return (
                  <li
                    key={order.id}
                    className={`grid grid-cols-[0.9fr_1.1fr_0.6fr_0.55fr_0.75fr_0.7fr_0.75fr_0.85fr_0.7fr] gap-2 px-4 py-3 text-sm text-zinc-300 ${
                      order.archived_at ? "opacity-70" : ""
                    }`}
                  >
                    <span className="font-mono text-xs text-zinc-300">
                      #{shortOrderId(order.id)}
                      {order.archived_at ? (
                        <span className="mt-1 block text-[8px] uppercase tracking-[0.14em] text-zinc-600">
                          Archived
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate text-xs" title={customerLabel}>
                      {customerLabel}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {order.line_count} line{order.line_count === 1 ? "" : "s"} · {order.unit_count}{" "}
                      unit{order.unit_count === 1 ? "" : "s"}
                    </span>
                    <span className="font-serif text-[#e87a82]">
                      {formatCentsUsd(order.total_cents)}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.1em] text-zinc-500">
                      {formatDeliveryMethodLabel(order.delivery_method)}
                    </span>
                    <span>
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${paymentStatusBadgeClass(order.status)}`}
                      >
                        {formatOrderStatusLabel(order.status)}
                      </span>
                    </span>
                    <span>
                      {order.delivery_method === "local_pickup" ? (
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${pickupStatusBadgeClass(order.pickup_status)}`}
                        >
                          {formatPickupStatusLabel(order.pickup_status)}
                        </span>
                      ) : (
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${fulfillmentStatusBadgeClass(order.fulfillment_status)}`}
                        >
                          {formatFulfillmentStatusLabel(order.fulfillment_status)}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                    <span>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="rounded-full border border-[#b4141e]/40 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-[#e87a82] hover:bg-[#b4141e]/10"
                      >
                        Manage
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <AdminOrderDetailPanel
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onUpdated={() => void loadOrders()}
        onDeleted={() => {
          setSelectedOrderId(null);
          void loadOrders();
        }}
      />
    </div>
  );
}
