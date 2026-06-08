"use client";

import { useEffect, useState } from "react";
import {
  checkoutPlanType,
  formatMembershipPlanType,
  type MembershipPlanType,
} from "@/lib/membership";
import {
  BLACKCARD_ACTIVE_PERKS,
  BLACKCARD_CREDITS_TAGLINE,
  BLACKCARD_HERO_DESCRIPTION,
} from "@/lib/blackcard/perks";
import { resolveBlackcardPlanPerks } from "@/lib/blackcard/plan-perks";
import {
  formatPrice,
  sanitizePlan,
  type MembershipPlan,
  type MembershipPlanRow,
} from "@/components/blackcard/types";
import { BillingPortalButton } from "@/components/blackcard/BillingPortalButton";
import { BlackcardPerksPreview } from "@/components/blackcard/BlackcardPerksPreview";
import { useBlackcardAccess } from "@/hooks/useBlackcardAccess";
import { supabase } from "@/lib/supabase";
import { CS_CTA_PRIMARY_LG } from "@/lib/crimson-accent";

function formatMembershipDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function membershipStatusLine({
  isAdmin,
  membership,
}: {
  isAdmin: boolean;
  membership: ReturnType<typeof useBlackcardAccess>["membership"];
}) {
  if (isAdmin) return "Admin Blackcard Access · active";

  const plan = formatMembershipPlanType(membership?.plan_type);
  const status = membership?.status ?? "active";
  const periodEnd = formatMembershipDate(membership?.current_period_end);

  if (!periodEnd) return `${plan} · ${status}`;

  const periodAction = membership?.cancel_at_period_end
    ? "Cancels on"
    : "Renews on";

  return `${plan} · ${status} · ${periodAction} ${periodEnd}`;
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
      className={`w-full ${CS_CTA_PRIMARY_LG} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {loading ? "Redirecting..." : label}
    </button>
  );
}

export default function BlackcardPage() {
  const {
    loading: accessLoading,
    membership,
    hasAccess: isPremium,
    isAdmin,
    error: accessError,
  } = useBlackcardAccess();
  const [plansLoading, setPlansLoading] = useState(true);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [plansError, setPlansError] = useState("");

  useEffect(() => {
    async function loadPlans() {
      try {
        setPlansLoading(true);
        setPlansError("");

        const { data: planData, error: planError } = await supabase
          .from("membership_plans")
          .select(
            "id, plan_type, title, description, price, stripe_price_id, active, perks, created_at, updated_at",
          )
          .order("price", { ascending: true });

        if (planError) {
          setPlansError(planError.message);
        } else {
          setPlans(((planData ?? []) as MembershipPlanRow[]).map(sanitizePlan));
        }
      } catch (error: unknown) {
        console.error(error);
        setPlansError(
          error instanceof Error ? error.message : "Unable to load Blackcard plans.",
        );
      } finally {
        setPlansLoading(false);
      }
    }

    void loadPlans();
  }, []);

  const errorMsg = accessError || plansError;

  if (accessLoading || plansLoading) {
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
              You are inside the premium layer of Crimson Society. Member-only rides,
              early collections, and elevated identity are unlocked across the app.
            </p>

            <div className="mt-8 grid gap-2 md:grid-cols-2">
              {BLACKCARD_ACTIVE_PERKS.map((perk) => (
                <div key={perk} className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                  <span className="mr-2 text-[#b4141e]">✦</span>
                  {perk}
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Rides
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Member-only meets
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Filter Blackcard meets on the meets page and host private runs for members.
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
                  Your Blackcard badge is visible on your profile and member cards.
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
                  {membershipStatusLine({ isAdmin, membership })}
                </p>
              </div>
            </div>

            <BlackcardPerksPreview unlocked />

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
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">{BLACKCARD_HERO_DESCRIPTION}</p>
          <p className="mt-3 max-w-2xl text-xs leading-6 text-zinc-500">{BLACKCARD_CREDITS_TAGLINE}</p>

          {errorMsg && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {plans.filter((plan) => plan.active).map((plan) => (
              <div
                key={plan.id || plan.plan_type}
                className="group rounded-[24px] border border-white/10 bg-white/[0.03] p-6 transition duration-200 hover:border-red-900/25 hover:shadow-[0_0_28px_rgba(120,0,0,0.12)]"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-red-400/80">
                  {plan.plan_type === "monthly" ? "Monthly" : "Annual"}
                </p>
                <h2 className="mt-3 text-2xl font-light">{plan.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">{plan.description}</p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Earn credits as a member. Redeem future rewards when redemption launches.
                </p>
                <p className="mt-5 font-serif text-4xl text-white">
                  ${formatPrice(plan.price)}
                  <span className="ml-2 font-sans text-xs uppercase tracking-[0.2em] text-zinc-500">
                    / {plan.plan_type === "monthly" ? "mo" : "yr"}
                  </span>
                </p>
                <ul className="mt-5 space-y-2">
                  {resolveBlackcardPlanPerks(plan).map((perk) => (
                    <li key={perk} className="text-sm text-zinc-400">
                      <span className="mr-2 text-[#b4141e]">✦</span>
                      {perk}
                    </li>
                  ))}
                </ul>
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

          <BlackcardPerksPreview unlocked={false} />
        </div>
      </div>
    </main>
  );
}
