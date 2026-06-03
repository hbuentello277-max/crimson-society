"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  checkoutPlanType,
  formatMembershipPlanType,
  hasBlackcardAccess,
  type MembershipPlanType,
  type MembershipRow,
} from "@/lib/membership";
import {
  formatPrice,
  sanitizePlan,
  type MembershipPlan,
  type MembershipPlanRow,
} from "@/components/blackcard/types";

const lockedPerks = [
  "Crimson Credits",
  "Early merch access",
  "Member-only rides",
  "Private Blackcard chat",
  "Priority ride access",
  "Limited merch reservations",
  "Exclusive drops/giveaways",
  "Coming soon rewards",
];


function BillingPortalButton() {
  const [loading, setLoading] = useState(false);

  async function handleOpenPortal() {
    try {
      setLoading(true);

      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Unable to open billing portal.");
        return;
      }

      if (!data.url) {
        alert("Billing portal URL was not returned.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Something went wrong opening billing management.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleOpenPortal}
      disabled={loading}
      className="rounded-full border border-white/15 px-6 py-3 text-xs uppercase tracking-[0.28em] text-zinc-200 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Opening..." : "Manage Subscription"}
    </button>
  );
}

function CheckoutButton({
  planType,
  label,
}: {
  planType: MembershipPlanType;
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
        body: JSON.stringify({ planType: checkoutPlanType(planType) }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "already_subscribed") {
          const openPortal = window.confirm(
            `${data.error}\n\nOpen billing management now?`,
          );
          if (openPortal) {
            const portalRes = await fetch("/api/stripe/billing-portal", {
              method: "POST",
            });
            const portalData = await portalRes.json();
            if (portalRes.ok && portalData.url) {
              window.location.href = portalData.url;
            }
          }
          return;
        }

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
  const { loading: authLoading, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;

    async function loadMembership() {
      try {
        setLoading(true);
        setErrorMsg("");

        const { data: planData, error: planError } = await supabase
          .from("membership_plans")
          .select(
            "id, plan_type, title, description, price, stripe_price_id, active, perks, created_at, updated_at"
          )
          .order("price", { ascending: true });

        if (planError) {
          setErrorMsg(planError.message);
        } else {
          setPlans(((planData ?? []) as MembershipPlanRow[]).map(sanitizePlan));
        }

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
          .in("status", ["active", "trialing"])
          .or(`current_period_end.is.null,current_period_end.gte.${new Date().toISOString()}`)
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
      } catch (error: unknown) {
        console.error(error);
        setErrorMsg(error instanceof Error ? error.message : "Unable to load Blackcard.");
        setLoading(false);
      }
    }

    loadMembership();
  }, [authLoading]);

  const isPremium = hasBlackcardAccess(membership, isAdmin);

  if (loading || authLoading) {
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
              Blackcard Members
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
                  {isAdmin
                    ? "Admin Blackcard Access · active"
                    : `${formatMembershipPlanType(membership?.plan_type)} · ${membership?.status}`}
                  {!isAdmin && membership?.current_period_end
                    ? ` · renews ${new Date(membership.current_period_end).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
            </div>

            {!isAdmin && (
              <div className="mt-8">
                <BillingPortalButton />
              </div>
            )}
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
            {plans.filter((plan) => plan.active).map((plan, index) => (
              <div
                key={plan.id || plan.plan_type}
                className={`rounded-[24px] border p-6 ${
                  index === 0
                    ? "border-red-900/30 bg-[#120707]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.24em] text-red-400/80">
                  {plan.plan_type === "monthly" ? "Monthly" : "Annual"}
                </p>
                <h2 className="mt-3 text-2xl font-light">{plan.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">{plan.description}</p>
                <p className="mt-5 font-serif text-4xl text-white">
                  ${formatPrice(plan.price)}
                  <span className="ml-2 font-sans text-xs uppercase tracking-[0.2em] text-zinc-500">
                    / {plan.plan_type === "monthly" ? "mo" : "yr"}
                  </span>
                </p>
                {plan.perks.length > 0 && (
                  <ul className="mt-5 space-y-2">
                    {plan.perks.slice(0, 5).map((perk) => (
                      <li key={perk} className="text-sm text-zinc-400">
                        <span className="mr-2 text-[#b4141e]">✦</span>
                        {perk}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6">
                  <CheckoutButton
                    planType={plan.plan_type}
                    label={`Start ${plan.plan_type === "monthly" ? "Monthly" : "Annual"} Membership`}
                  />
                </div>
              </div>
            ))}
          </div>

          {plans.filter((plan) => plan.active).length === 0 && (
            <div className="mt-10 rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm text-zinc-400">
                No active Blackcard plans are available right now.
              </p>
            </div>
          )}

          <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.025] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-red-400/80">
              Locked Blackcard Preview
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {lockedPerks.map((perk) => (
                <div
                  key={perk}
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3"
                >
                  <span className="text-sm text-zinc-300">{perk}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Locked
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      </main>
  );
}
