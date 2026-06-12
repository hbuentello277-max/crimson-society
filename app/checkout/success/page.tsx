"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dispatchMembershipUpdated } from "@/lib/membership-events";
import { fetchProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | null;

export default function CheckoutSuccessPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadStatus() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          setErrorMsg(userError.message);
          setLoading(false);
          return;
        }

        if (!user) {
          setErrorMsg("You need to be logged in.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        const nextStatus = (data?.status as SubscriptionStatus) ?? null;
        setStatus(nextStatus);

        if (nextStatus === "active" || nextStatus === "trialing") {
          const refreshedProfile = await fetchProfile(user.id);
          if (refreshedProfile) {
            window.dispatchEvent(
              new CustomEvent("crimson-profile-updated", { detail: refreshedProfile }),
            );
          }
          dispatchMembershipUpdated();
        }

        setLoading(false);
      } catch (error: unknown) {
        console.error(error);
        setErrorMsg(error instanceof Error ? error.message : "Unable to confirm subscription.");
        setLoading(false);
      }
    }

    loadStatus();
    const interval = setInterval(loadStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  const isActive = status === "active" || status === "trialing";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-14">
        <div className="w-full rounded-[32px] border border-white/10 bg-[#090909] p-8 md:p-10 shadow-[0_0_80px_rgba(120,0,0,0.12)]">
          <p className="text-xs uppercase tracking-[0.35em] text-red-500/70">
            Checkout
          </p>

          <h1 className="mt-4 text-4xl font-light tracking-tight">
            Payment received.
          </h1>

          {loading && (
            <p className="mt-4 text-sm text-zinc-400">
              We’re confirming your membership with Blackcard now.
            </p>
          )}

          {!loading && errorMsg && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          {!loading && !errorMsg && isActive && (
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Your membership is active. You can return to Blackcard and access the premium area.
            </p>
          )}

          {!loading && !errorMsg && !isActive && (
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Your payment completed, but the subscription has not been marked active yet.
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
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-4 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30"
            >
              Back Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}