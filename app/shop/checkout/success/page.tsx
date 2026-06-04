"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <main className="min-h-screen bg-[#050405] px-5 py-20 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#0a0a0b] p-8">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Merch checkout</p>
        <h1 className="mt-3 font-serif text-3xl italic text-white">Payment received</h1>
        <p className="mt-4 text-sm text-zinc-400">
          We are confirming your order. Fulfillment and order history will be available in a
          future update.
        </p>
        {sessionId ? (
          <p className="mt-2 font-mono text-[10px] text-zinc-600">Session {sessionId.slice(0, 20)}…</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/shop"
            className="inline-flex justify-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-6 py-3 text-xs uppercase tracking-[0.28em] text-[#e87a82]"
          >
            Back to shop
          </Link>
          <Link
            href="/"
            className="inline-flex justify-center rounded-full border border-white/15 px-6 py-3 text-xs uppercase tracking-[0.2em] text-zinc-300"
          >
            Home
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
