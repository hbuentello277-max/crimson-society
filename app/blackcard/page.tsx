"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

type MembershipPlan = {
  id: string;
  plan_type: "monthly" | "yearly";
  title: string;
  description: string;
  price: number;
  active: boolean;
  perks: string[];
  created_at: string | null;
  updated_at: string | null;
};

type MembershipPlanRow = {
  id: string;
  plan_type: "monthly" | "yearly";
  title: string | null;
  description: string | null;
  price: number | string | null;
  active: boolean | null;
  perks: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

type OptionalMessage = {
  enabled?: boolean;
  eyebrow?: string;
  title?: string;
  body?: string;
};

function sanitizePlan(row: MembershipPlanRow): MembershipPlan {
  return {
    id: row.id,
    plan_type: row.plan_type,
    title:
      row.title ??
      (row.plan_type === "monthly" ? "Monthly Plan" : "Yearly Plan"),
    description:
      row.description ??
      (row.plan_type === "monthly"
        ? "Flexible entry for Blackcard Access"
        : "Preferred value with priority standing"),
    price: Number(row.price ?? 0),
    active: row.active ?? true,
    perks: Array.isArray(row.perks) ? row.perks : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatPrice(value: number) {
  const normalized = Number(value || 0);
  return normalized % 1 === 0 ? normalized.toFixed(0) : normalized.toFixed(2);
}

function LoadingCard() {
  return (
    <div className="h-[176px] animate-pulse rounded-[26px] border border-white/10 bg-white/[0.03]" />
  );
}

function OptionalMessageBlock({
  message,
}: {
  message?: OptionalMessage;
}) {
  if (!message?.enabled) return null;

  return (
    <div className="mt-5 rounded-[24px] border border-[#b4141e]/20 bg-[#b4141e]/[0.05] px-5 py-4">
      {message.eyebrow ? (
        <p className="text-[10px] uppercase tracking-[0.34em] text-[#e87a82]">
          {message.eyebrow}
        </p>
      ) : null}

      {message.title ? (
        <h3 className="mt-2 font-serif text-[1.15rem] text-white">
          {message.title}
        </h3>
      ) : null}

      {message.body ? (
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-zinc-400/85">
          {message.body}
        </p>
      ) : null}
    </div>
  );
}

export default function BlackcardPage() {
  const { session, isAdmin } = useAuth();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [pageMessage, setPageMessage] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "yearly"
  );

  const monthlyPlan = useMemo(
    () => plans.find((plan) => plan.plan_type === "monthly"),
    [plans]
  );

  const yearlyPlan = useMemo(
    () => plans.find((plan) => plan.plan_type === "yearly"),
    [plans]
  );

  const selectedPlanData =
    selectedPlan === "monthly" ? monthlyPlan : yearlyPlan;

  const visiblePerks = useMemo(
    () => Array.from(new Set(plans.flatMap((plan) => plan.perks).filter(Boolean))),
    [plans]
  );

  useEffect(() => {
    async function loadMembershipPlans() {
      setLoadingPlans(true);
      setPageMessage("");

      const { data, error } = await supabase
        .from("membership_plans")
        .select(
          "id, plan_type, title, description, price, active, perks, created_at, updated_at"
        )
        .eq("active", true)
        .order("created_at", { ascending: true });

      if (error) {
        setPageMessage("Unable to load membership plans right now.");
        setLoadingPlans(false);
        return;
      }

      const normalized = ((data ?? []) as MembershipPlanRow[]).map(sanitizePlan);
      setPlans(normalized);

      if (!normalized.some((plan) => plan.plan_type === selectedPlan)) {
        if (normalized.some((plan) => plan.plan_type === "yearly")) {
          setSelectedPlan("yearly");
        } else if (normalized.some((plan) => plan.plan_type === "monthly")) {
          setSelectedPlan("monthly");
        }
      }

      setLoadingPlans(false);
    }

    void loadMembershipPlans();
  }, [selectedPlan]);

  async function handleContinue() {
    if (!session?.user) {
      setPageMessage("Please sign in to continue with membership.");
      return;
    }

    if (!selectedPlanData) {
      setPageMessage("Please select an available membership plan.");
      return;
    }

    setPageMessage(
      `${selectedPlanData.title} selected. Connect your checkout flow or subscription handler here.`
    );
  }

  const optionalMessage: OptionalMessage = {
    enabled: true,
    eyebrow: "Private Access",
    title: "Optional message block",
    body:
      selectedPlan === "yearly"
        ? "Yearly access remains the preferred long-hold option for riders who want value, stronger standing, and a cleaner path into member-only privileges."
        : "Monthly access keeps entry flexible while preserving the same private Blackcard atmosphere and premium member presentation.",
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(180,20,30,0.25), transparent 65%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b4141e]/70 to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 pb-28 pt-12">
        <section className="overflow-hidden rounded-[32px] border border-[#b4141e]/25 bg-gradient-to-b from-[#121114] via-[#0b0b0d] to-[#060606] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)]">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.2),transparent_45%)] px-6 py-7 md:px-8 md:py-8">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/profile"
                className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
              >
                Back
              </Link>

              {isAdmin ? (
                <span className="rounded-full border border-[#b4141e]/30 bg-[#b4141e]/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#f0c8cb]">
                  Admin
                </span>
              ) : null}
            </div>

            <div className="mt-7 flex items-center justify-center gap-4">
              <span className="h-px w-10 bg-white/15" />
              <span className="text-[#b4141e]">✦</span>
              <span className="h-px w-10 bg-white/15" />
            </div>

            <p className="mt-5 text-center text-[11px] uppercase tracking-[0.42em] text-[#e87a82]">
              BLACKCARD MEMBERS
            </p>

            <h1 className="mt-3 text-center font-serif text-[2.35rem] leading-[0.95] text-white md:text-[3.1rem]">
              Reserved for premium riders
            </h1>

            <p className="mx-auto mt-4 max-w-[34rem] text-center text-[13px] leading-6 text-zinc-400/80 md:text-sm">
              Entry grants earlier access, preferred placement, private
              privileges, and a quieter tier of access held beyond the public
              line.
            </p>
          </div>

          <div className="px-6 py-7 md:px-8 md:py-8">
            <div className="grid gap-4 md:grid-cols-2">
              {loadingPlans ? (
                <>
                  <LoadingCard />
                  <LoadingCard />
                </>
              ) : (
                <>
                  {monthlyPlan ? (
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("monthly")}
                      className={`rounded-[26px] border p-5 text-left transition ${
                        selectedPlan === "monthly"
                          ? "border-[#b4141e]/60 bg-[#b4141e]/10 shadow-[0_0_30px_-18px_rgba(180,20,30,0.55)]"
                          : "border-white/10 bg-white/[0.03] hover:border-[#b4141e]/35"
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.34em] text-[#e87a82]">
                        {monthlyPlan.title}
                      </p>

                      <h2 className="mt-3 font-serif text-[2.15rem] leading-none text-white">
                        ${formatPrice(monthlyPlan.price)}
                      </h2>

                      <p className="mt-2 text-[13px] leading-6 text-zinc-400/85">
                        {monthlyPlan.description}
                      </p>
                    </button>
                  ) : null}

                  {yearlyPlan ? (
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("yearly")}
                      className={`rounded-[26px] border p-5 text-left transition ${
                        selectedPlan === "yearly"
                          ? "border-[#b4141e]/60 bg-[#b4141e]/10 shadow-[0_0_30px_-18px_rgba(180,20,30,0.55)]"
                          : "border-white/10 bg-white/[0.03] hover:border-[#b4141e]/35"
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.34em] text-[#e87a82]">
                        {yearlyPlan.title}
                      </p>

                      <h2 className="mt-3 font-serif text-[2.15rem] leading-none text-white">
                        ${formatPrice(yearlyPlan.price)}
                      </h2>

                      <p className="mt-2 text-[13px] leading-6 text-zinc-400/85">
                        {yearlyPlan.description}
                      </p>
                    </button>
                  ) : null}
                </>
              )}
            </div>

            {visiblePerks.length > 0 ? (
              <div className="mt-7 grid gap-3 md:grid-cols-2">
                {visiblePerks.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[13px] text-zinc-300"
                  >
                    {feature}
                  </div>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedPlanData || loadingPlans}
              className="mt-7 w-full rounded-full bg-[#b4141e]/80 px-5 py-3 text-[11px] uppercase tracking-[0.28em] text-white transition hover:bg-[#b4141e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with {selectedPlanData?.title ?? "Selected Plan"}
            </button>

            <OptionalMessageBlock message={optionalMessage} />

            {pageMessage ? (
              <div className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[12px] leading-6 text-zinc-400">{pageMessage}</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}