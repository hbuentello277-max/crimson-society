"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | null;

export default function CheckoutSuccessPage() {
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function checkStatus() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("You must be logged in to confirm membership.");
          setLoading(false);
          return;
        }

        const { data, error: subError } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing", "past_due", "canceled", "incomplete"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subError) {
          setError("Unable to check subscription yet.");
          setLoading(false);
          return;
        }

        setStatus((data?.status as SubscriptionStatus) ?? null);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setError("Something went wrong while checking membership.");
        setLoading(false);
      }
    }

    checkStatus();
    interval = setInterval(checkStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  const isPremium = status === "active" || status === "trialing";

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-[#090909] p-8 shadow-[0_0_80px_rgba(120,0,0,0.25)]">
        <p className="text-xs uppercase tracking-[0.35em] text-red-500/70">
          Blackcard
        </p>

        <h1 className="mt-3 text-4xl font-light tracking-tight">
          Payment received.
        </h1>

        {loading && (
          <p className="mt-4 text-sm text-zinc-400">
            We’re confirming your Blackcard access now.
          </p>
        )}

        {!loading && error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        {!loading && !error && isPremium && (
          <p className="mt-4 text-sm text-zinc-300">
            Your membership is active. Blackcard sections are now unlocked.
          </p>
        )}

        {!loading && !error && !isPremium && (
          <p className="mt-4 text-sm text-zinc-400">
            Your payment finished, but membership has not been marked active yet.
            This usually means the webhook is still processing.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/blackcard"
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-4 text-xs font-semibold uppercase tracking-[0.28em] text-black transition hover:bg-red-500"
          >
            Return to Blackcard
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-4 text-xs uppercase tracking-[0.2em] text-zinc-200 transition hover:border-white/30 hover:text-white"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}