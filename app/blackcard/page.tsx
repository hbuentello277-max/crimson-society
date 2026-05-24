"use client";

import { useEffect, useState } from "react";
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

type MembershipRow = {
  status: SubscriptionStatus;
  plan_type: string | null;
  current_period_end: string | null;
};

function CheckoutButton({
  planType,
  label,
}: {
  planType: "apex_monthly" | "apex_yearly";
  label: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    try {
      setLoading(true);

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planType }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Unable to start checkout.");
        return;
      }

      if (!data.url) {
        alert("Checkout URL was not returned.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Something went wrong starting checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full rounded-full bg-red-600 px-6 py-4 text-xs font-semibold uppercase tracking-[0.28em] text-black transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Redirecting..." : label}
    </button>
  );
}

export default function BlackcardPage() {
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadMembership() {
      try {
        setLoading(true);
        setErrorMsg("");

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
          setMembership(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("subscriptions")
          .select("status, plan_type, current_period_end")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        setMembership((data as MembershipRow | null) ?? null);
        setLoading(false);
      } catch (error: any) {
        console.error(error);
        setErrorMsg(error?.message || "Unable to load Blackcard.");
        setLoading(false);
      }
    }

    loadMembership();
  }, []);

  const isPremium =
    membership?.status === "active" || membership?.status === "trialing";

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
          <div className="w-full rounded-[32px] border border-white/10 bg-[#090909] p-8">
            <p className="text-sm text-zinc-400">Loading Blackcard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (isPremium) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="rounded-[32px] border border-red-900/30 bg-[radial-gradient(circle_at_top,rgba(120,0,0,0.18),transparent_40%),#090909] p-8 md:p-10 shadow-[0_0_100px_rgba(120,0,0,0.12)]">
            <p className="text-xs uppercase tracking-[0.38em] text-red-500/70">
              Apex Members
            </p>
            <h1 className="mt-4 text-4xl font-light tracking-tight md:text-5xl">
              Blackcard access is active.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
              You are inside the premium layer of Crimson Society. This space is reserved
              for active members with elevated access across rides, future private spaces,
              early collections, and premium identity inside the app.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Access
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Reserved ride placements
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Priority member visibility for premium ride drops and future private runs.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Commerce
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Early collection access
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  First-window access to select drops, private releases, and premium pieces.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Identity
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Elevated member presence
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Premium profile positioning, future badges, and a stronger inner-circle identity.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Status
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Membership on record
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {membership?.plan_type || "apex"} · {membership?.status}
                  {membership?.current_period_end
                    ? ` · renews ${new Date(membership.current_period_end).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(120,0,0,0.14),transparent_38%),#090909] p-8 md:p-10 shadow-[0_0_80px_rgba(120,0,0,0.1)]">
          <p className="text-xs uppercase tracking-[0.38em] text-red-500/70">
            Blackcard
          </p>
          <h1 className="mt-4 text-4xl font-light tracking-tight md:text-5xl">
            Enter the inner circle.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
            Blackcard is the premium layer of Crimson Society: reserved ride access,
            future private spaces, early collections, and elevated identity across the platform.
          </p>

          {errorMsg && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-red-900/30 bg-[#120707] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-red-400/80">
                Monthly
              </p>
              <h2 className="mt-3 text-2xl font-light">Apex Monthly</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Flexible recurring access to the premium Crimson Society tier.
              </p>
              <div className="mt-6">
                <CheckoutButton
                  planType="apex_monthly"
                  label="Start Monthly Membership"
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-red-400/80">
                Annual
              </p>
              <h2 className="mt-3 text-2xl font-light">Apex Yearly</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Full-year Blackcard access for riders committed to the inner circle.
              </p>
              <div className="mt-6">
                <CheckoutButton
                  planType="apex_yearly"
                  label="Start Annual Membership"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}