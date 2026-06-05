"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
  type ShopFulfillmentStatus,
  type ShopPickupStatus,
} from "@/lib/shop/orders";

type OrderItem = {
  id: string;
  product_name: string;
  product_image_url: string | null;
  size: string | null;
  quantity: number;
  line_total_cents: number;
};

type AdminOrderDetail = {
  id: string;
  status: string;
  fulfillment_status: ShopFulfillmentStatus;
  delivery_method: string;
  pickup_status: ShopPickupStatus;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_email: string | null;
  shipping_name: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  admin_fulfillment_note: string | null;
  customer_note: string | null;
  pickup_note: string | null;
  created_at: string;
  items: OrderItem[];
};

type Props = {
  orderId: string | null;
  onClose: () => void;
  onUpdated: () => void;
};

export function AdminOrderDetailPanel({ orderId, onClose, onUpdated }: Props) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fulfillmentStatus, setFulfillmentStatus] = useState<ShopFulfillmentStatus>("unfulfilled");
  const [pickupStatus, setPickupStatus] = useState<ShopPickupStatus>("not_applicable");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [pickupNote, setPickupNote] = useState("");

  const isPickup = order?.delivery_method === "local_pickup";

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/shop/orders/${orderId}`);
        const data = (await res.json()) as { order?: AdminOrderDetail; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Failed to load order");
          setOrder(null);
          return;
        }
        const o = data.order ?? null;
        setOrder(o);
        if (o) {
          setFulfillmentStatus(o.fulfillment_status);
          setPickupStatus(o.pickup_status);
          setTrackingCarrier(o.tracking_carrier ?? "");
          setTrackingNumber(o.tracking_number ?? "");
          setTrackingUrl(o.tracking_url ?? "");
          setAdminNote(o.admin_fulfillment_note ?? "");
          setCustomerNote(o.customer_note ?? "");
          setPickupNote(o.pickup_note ?? "");
        }
      } catch {
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [orderId]);

  async function savePatch(patch: Record<string, unknown>) {
    if (!orderId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shop/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { order?: AdminOrderDetail; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      if (data.order) {
        setOrder(data.order);
        setFulfillmentStatus(data.order.fulfillment_status);
        setPickupStatus(data.order.pickup_status);
        setTrackingCarrier(data.order.tracking_carrier ?? "");
        setTrackingNumber(data.order.tracking_number ?? "");
        setTrackingUrl(data.order.tracking_url ?? "");
        setAdminNote(data.order.admin_fulfillment_note ?? "");
        setCustomerNote(data.order.customer_note ?? "");
        setPickupNote(data.order.pickup_note ?? "");
      }
      onUpdated();
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!orderId) return null;

  return (
    <div className="rounded-2xl border border-[#b4141e]/30 bg-[#120608]/40 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Manage order</p>
          {order ? (
            <p className="mt-1 font-mono text-sm text-white">#{shortOrderId(order.id)}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-400 hover:text-white"
        >
          Close
        </button>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}

      {order ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${paymentStatusBadgeClass(order.status)}`}
              >
                {formatOrderStatusLabel(order.status)}
              </span>
              {isPickup ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${pickupStatusBadgeClass(order.pickup_status)}`}
                >
                  {formatPickupStatusLabel(order.pickup_status)}
                </span>
              ) : (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${fulfillmentStatusBadgeClass(order.fulfillment_status)}`}
                >
                  {formatFulfillmentStatusLabel(order.fulfillment_status)}
                </span>
              )}
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-zinc-400">
                {formatDeliveryMethodLabel(order.delivery_method)}
              </span>
            </div>

            <p className="text-xs text-zinc-500">
              {order.shipping_email ?? "—"}
              {order.shipping_name ? ` · ${order.shipping_name}` : ""}
            </p>

            <ul className="space-y-2">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-2 rounded-xl border border-white/10 bg-black/30 p-2"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    {item.product_image_url ? (
                      <Image
                        src={item.product_image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 text-xs">
                    <p className="text-white">{item.product_name}</p>
                    <p className="text-zinc-500">
                      {item.size ? `Size ${item.size} · ` : ""}Qty {item.quantity}
                    </p>
                    <p className="text-[#e87a82]">{formatCentsUsd(item.line_total_cents)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-sm text-[#e87a82]">Total {formatCentsUsd(order.total_cents)}</p>
          </div>

          <div className="space-y-4">
            {isPickup ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void savePatch({ pickup_status: "ready" })}
                    className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-sky-200 disabled:opacity-50"
                  >
                    Mark ready for pickup
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void savePatch({ pickup_status: "picked_up" })}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-emerald-300 disabled:opacity-50"
                  >
                    Mark picked up
                  </button>
                </div>

                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                    Pickup status
                  </span>
                  <select
                    value={pickupStatus}
                    disabled={saving}
                    onChange={(e) => setPickupStatus(e.target.value as ShopPickupStatus)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  >
                    <option value="pending" className="bg-black">
                      Pickup pending
                    </option>
                    <option value="ready" className="bg-black">
                      Ready for pickup
                    </option>
                    <option value="picked_up" className="bg-black">
                      Picked up
                    </option>
                    <option value="cancelled" className="bg-black">
                      Cancelled
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                    Pickup note (customer-facing)
                  </span>
                  <textarea
                    rows={2}
                    value={pickupNote}
                    disabled={saving}
                    onChange={(e) => setPickupNote(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void savePatch({
                      pickup_status: pickupStatus,
                      pickup_note: pickupNote,
                    })
                  }
                  className="w-full rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-4 py-3 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save pickup changes"}
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void savePatch({ fulfillment_status: "fulfilled" })}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-emerald-300 disabled:opacity-50"
                  >
                    Mark fulfilled
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void savePatch({ fulfillment_status: "shipped" })}
                    className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-sky-200 disabled:opacity-50"
                  >
                    Mark shipped
                  </button>
                </div>

                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                    Fulfillment status
                  </span>
                  <select
                    value={fulfillmentStatus}
                    disabled={saving}
                    onChange={(e) =>
                      setFulfillmentStatus(e.target.value as ShopFulfillmentStatus)
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  >
                    <option value="unfulfilled" className="bg-black">
                      Unfulfilled
                    </option>
                    <option value="fulfilled" className="bg-black">
                      Fulfilled
                    </option>
                    <option value="shipped" className="bg-black">
                      Shipped
                    </option>
                    <option value="cancelled" className="bg-black">
                      Cancelled
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                    Tracking carrier
                  </span>
                  <input
                    value={trackingCarrier}
                    disabled={saving}
                    onChange={(e) => setTrackingCarrier(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                    Tracking number
                  </span>
                  <input
                    value={trackingNumber}
                    disabled={saving}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                    Tracking URL
                  </span>
                  <input
                    value={trackingUrl}
                    disabled={saving}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                    Internal admin note
                  </span>
                  <textarea
                    rows={2}
                    value={adminNote}
                    disabled={saving}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                    Customer-facing note
                  </span>
                  <textarea
                    rows={2}
                    value={customerNote}
                    disabled={saving}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void savePatch({
                      fulfillment_status: fulfillmentStatus,
                      tracking_carrier: trackingCarrier,
                      tracking_number: trackingNumber,
                      tracking_url: trackingUrl,
                      admin_fulfillment_note: adminNote,
                      customer_note: customerNote,
                    })
                  }
                  className="w-full rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-4 py-3 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
