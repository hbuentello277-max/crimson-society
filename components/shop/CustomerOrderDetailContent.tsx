"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/crimson-accent";
import { ShopProductImage } from "@/components/shop/ShopProductImage";
import { PickupLocationCard } from "@/components/shop/PickupLocationCard";
import { OrderStatusTimeline } from "@/components/shop/OrderStatusTimeline";
import {
  formatCentsUsd,
  fulfillmentStatusBadgeClass,
  formatFulfillmentStatusLabel,
  formatPickupStatusLabel,
  paymentStatusBadgeClass,
  formatOrderStatusLabel,
  pickupStatusBadgeClass,
  shortOrderId,
} from "@/lib/shop/orders";
import {
  buildPickupOrderTimeline,
  buildShippingOrderTimeline,
} from "@/lib/shop/order-timeline";

type OrderItem = {
  id: string;
  product_name: string;
  product_image_url: string | null;
  size: string | null;
  quantity: number;
  line_total_cents: number;
};

type OrderDetail = {
  id: string;
  status: string;
  fulfillment_status: string;
  delivery_method: string;
  pickup_status: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  tracking_number: string | null;
  tracking_carrier: string | null;
  tracking_url: string | null;
  customer_note: string | null;
  pickup_note: string | null;
  pickup_ready_at: string | null;
  picked_up_at: string | null;
  fulfilled_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  items: OrderItem[];
};

export function CustomerOrderDetailContent({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/shop/orders/${orderId}`, { credentials: "include" });
        const data = (await res.json()) as { order?: OrderDetail; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Order not found.");
          setOrder(null);
          return;
        }
        setOrder(data.order ?? null);
      } catch {
        setError("Could not load order.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [orderId]);

  return (
    <main className={`relative min-h-screen bg-[#050405] text-white ${BOTTOM_NAV_CLEARANCE}`}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            href="/profile/orders"
            className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 hover:text-white"
          >
            ← Orders
          </Link>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Order</p>
          <div className="w-12" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8">
        {loading ? <p className="text-sm text-zinc-500">Loading order…</p> : null}
        {error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {order ? (
          <>
            <h1 className="font-serif text-3xl italic text-white">Order #{shortOrderId(order.id)}</h1>
            <p className="mt-1 text-xs text-zinc-500">
              {new Date(order.created_at).toLocaleString()}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[9px] uppercase tracking-[0.14em] ${paymentStatusBadgeClass(order.status)}`}
              >
                Payment: {formatOrderStatusLabel(order.status)}
              </span>
              {order.delivery_method === "local_pickup" ? (
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[9px] uppercase tracking-[0.14em] ${pickupStatusBadgeClass(order.pickup_status)}`}
                >
                  {formatPickupStatusLabel(order.pickup_status)}
                </span>
              ) : (
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[9px] uppercase tracking-[0.14em] ${fulfillmentStatusBadgeClass(order.fulfillment_status)}`}
                >
                  {formatFulfillmentStatusLabel(order.fulfillment_status)}
                </span>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Order status</p>
              <OrderStatusTimeline
                steps={
                  order.delivery_method === "local_pickup"
                    ? buildPickupOrderTimeline({
                        pickup_status: order.pickup_status,
                        created_at: order.created_at,
                        pickup_ready_at: order.pickup_ready_at,
                        picked_up_at: order.picked_up_at,
                      })
                    : buildShippingOrderTimeline({
                        fulfillment_status: order.fulfillment_status,
                        created_at: order.created_at,
                        fulfilled_at: order.fulfilled_at,
                        shipped_at: order.shipped_at,
                        delivered_at: order.delivered_at,
                      })
                }
              />
            </div>

            {order.delivery_method === "local_pickup" ? (
              <div className="mt-4 space-y-2">
                <PickupLocationCard
                  mode={order.pickup_status === "ready" || order.pickup_status === "picked_up" ? "ready" : "preview"}
                  pickupNote={order.pickup_note}
                  pickupStatus={order.pickup_status}
                />
                {order.pickup_ready_at ? (
                  <p className="text-xs text-zinc-500">
                    Ready since {new Date(order.pickup_ready_at).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}

            <ul className="mt-8 space-y-3">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-black/30 p-3"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                    {item.product_image_url ? (
                      <ShopProductImage src={item.product_image_url} alt="" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base italic text-white">{item.product_name}</p>
                    {item.size ? (
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        Size {item.size} · Qty {item.quantity}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-zinc-500">Qty {item.quantity}</p>
                    )}
                    <p className="mt-2 text-sm text-[#e87a82]">
                      {formatCentsUsd(item.line_total_cents)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="text-white">{formatCentsUsd(order.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>{order.delivery_method === "local_pickup" ? "Pickup" : "Shipping"}</span>
                <span className="text-white">
                  {order.shipping_cents === 0 ? "Free" : formatCentsUsd(order.shipping_cents)}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3">
                <span className="text-zinc-500">Total</span>
                <span className="font-serif text-xl italic text-[#e87a82]">
                  {formatCentsUsd(order.total_cents)}
                </span>
              </div>
            </div>

            {order.delivery_method !== "local_pickup" &&
            (order.tracking_number || order.tracking_carrier || order.tracking_url) ? (
              <div className="mt-6 rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-sky-300">Tracking</p>
                {order.tracking_carrier ? (
                  <p className="mt-2 text-sm text-white">{order.tracking_carrier}</p>
                ) : null}
                {order.tracking_number ? (
                  <p className="mt-1 font-mono text-sm text-zinc-300">{order.tracking_number}</p>
                ) : null}
                {order.tracking_url ? (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-[10px] uppercase tracking-[0.2em] text-[#e87a82] underline-offset-2 hover:underline"
                  >
                    Track package
                  </a>
                ) : null}
              </div>
            ) : null}

            {order.customer_note ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Note</p>
                <p className="mt-2 text-sm text-zinc-300">{order.customer_note}</p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
