"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { formatCentsUsd, formatOrderStatusLabel } from "@/lib/shop/orders";

type OrderSummary = {
  id: string;
  status: string;
  status_label: string;
  total_cents: number;
  line_count: number;
  unit_count: number;
};

function isPaidOrderStatus(status: string) {
  return status === "paid";
}

function SuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const clearCart = useCart((s) => s.clear);

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slowConfirm, setSlowConfirm] = useState(false);

  const attemptsRef = useRef(0);
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("Missing checkout session.");
      return;
    }

    let cancelled = false;
    const maxAttempts = 15;
    const checkoutSessionId = sessionId;

    function clearBagOnce() {
      if (clearedRef.current) return;
      clearedRef.current = true;
      clearCart();
    }

    async function loadOrder() {
      try {
        const res = await fetch(
          `/api/shop/checkout/order?session_id=${encodeURIComponent(checkoutSessionId)}`,
          { credentials: "include" },
        );
        const data = (await res.json()) as { order?: OrderSummary; error?: string };

        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 404 && attemptsRef.current < maxAttempts) {
            attemptsRef.current += 1;
            if (attemptsRef.current >= 5) {
              setSlowConfirm(true);
            }
            window.setTimeout(() => void loadOrder(), 2000);
            return;
          }
          setError(data.error ?? "Could not load your order.");
          setLoading(false);
          return;
        }

        if (!data.order) {
          setError("Could not load your order.");
          setLoading(false);
          return;
        }

        setOrder(data.order);

        if (isPaidOrderStatus(data.order.status)) {
          clearBagOnce();
          setLoading(false);
          return;
        }

        if (attemptsRef.current < maxAttempts) {
          attemptsRef.current += 1;
          if (attemptsRef.current >= 4) {
            setSlowConfirm(true);
          }
          window.setTimeout(() => void loadOrder(), 2000);
          return;
        }

        clearBagOnce();
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Could not load your order.");
          setLoading(false);
        }
      }
    }

    attemptsRef.current = 0;
    setSlowConfirm(false);
    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [sessionId, clearCart]);

  const statusLabel = order ? formatOrderStatusLabel(order.status) : "Paid";
  const showConfirmed = order && isPaidOrderStatus(order.status);
  const showPendingAfterPoll = order && !isPaidOrderStatus(order.status) && !loading;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] px-5 py-20 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%),
            radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.16), transparent 70%)
          `,
        }}
      />

      <div className="relative mx-auto max-w-xl rounded-[28px] border border-[#b4141e]/25 bg-gradient-to-b from-[#120608] via-[#0a0a0b] to-[#090909] p-8 shadow-[0_0_80px_rgba(120,0,0,0.2)]">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Merch checkout</p>

        {loading ? (
          <>
            <h1 className="mt-3 font-serif text-3xl italic text-white">Confirming order…</h1>
            <p className="mt-4 text-sm text-zinc-400">
              We received your payment and are finalizing your order.
            </p>
            {slowConfirm ? (
              <p className="mt-3 text-xs text-zinc-500">
                This can take a moment. Your bag will clear once confirmation completes.
              </p>
            ) : null}
          </>
        ) : error ? (
          <>
            <h1 className="mt-3 font-serif text-3xl italic text-white">Payment received</h1>
            <p className="mt-4 text-sm text-zinc-400">{error}</p>
            <p className="mt-2 text-xs text-zinc-600">
              If this persists, contact support with your session reference.
            </p>
            {sessionId ? (
              <p className="mt-2 font-mono text-[10px] text-zinc-600">
                {sessionId.slice(0, 24)}…
              </p>
            ) : null}
          </>
        ) : showConfirmed && order ? (
          <>
            <h1 className="mt-3 font-serif text-3xl italic text-white">Order confirmed</h1>
            <p className="mt-2 text-sm text-zinc-400">Thank you for riding with Crimson Society.</p>

            <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Order number</span>
                <span className="font-mono text-xs text-zinc-300">
                  {order.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Items</span>
                <span className="text-white">
                  {order.line_count} line{order.line_count === 1 ? "" : "s"} · {order.unit_count}{" "}
                  unit{order.unit_count === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total</span>
                <span className="font-serif text-xl italic text-[#e87a82]">
                  {formatCentsUsd(order.total_cents)}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3 text-sm">
                <span className="text-zinc-500">Status</span>
                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-emerald-300">
                  {statusLabel}
                </span>
              </div>
            </div>
          </>
        ) : showPendingAfterPoll && order ? (
          <>
            <h1 className="mt-3 font-serif text-3xl italic text-white">Payment received</h1>
            <p className="mt-4 text-sm text-zinc-400">
              Your payment went through. Order confirmation is still processing — check Profile →
              Orders in a minute.
            </p>
            <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-200">
              Order #{order.id.slice(0, 8).toUpperCase()} · {statusLabel}
            </div>
          </>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          {order ? (
            <Link
              href={`/profile/orders/${order.id}`}
              className="inline-flex justify-center rounded-full border border-white/15 px-6 py-3 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              View order
            </Link>
          ) : null}
          <Link
            href="/shop"
            className="inline-flex justify-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-6 py-3 text-xs uppercase tracking-[0.28em] text-[#e87a82] transition hover:bg-[#b4141e]/30"
          >
            Back to shop
          </Link>
          <Link
            href="/profile/orders"
            className="inline-flex justify-center rounded-full border border-white/15 px-6 py-3 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            Your orders
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ShopCheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#050405] px-5 py-20 text-sm text-zinc-500">
          Loading…
        </main>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
