"use client";

import AdminPricingManager from "./AdminPricingManager";
import type { MembershipPlan } from "./types";
import { formatPrice } from "./types";

type Props = {
  onBack: () => void;
  selectedPlan: "monthly" | "yearly";
  setSelectedPlan: (plan: "monthly" | "yearly") => void;
  onUnlock: () => void;
  plans: MembershipPlan[];
  plansLoading: boolean;
  isAdmin: boolean;
  onRefreshPlans: () => Promise<void>;
};

export default function BlackcardPaywall({
  onBack,
  selectedPlan,
  setSelectedPlan,
  onUnlock,
  plans,
  plansLoading,
  isAdmin,
  onRefreshPlans,
}: Props) {
  const monthlyPlan = plans.find((plan) => plan.plan_type === "monthly");
  const yearlyPlan = plans.find((plan) => plan.plan_type === "yearly");
  const selectedPlanData = selectedPlan === "monthly" ? monthlyPlan : yearlyPlan;
  const visiblePerks = Array.from(
    new Set(plans.flatMap((plan) => plan.perks).filter(Boolean))
  );

  return (
    <section className="mt-8 overflow-hidden rounded-[32px] border border-[#b4141e]/25 bg-gradient-to-b from-[#121114] via-[#0b0b0d] to-[#060606] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.2),transparent_45%)] px-6 py-7 md:px-8 md:py-8">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
        >
          Back
        </button>

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
          Entry grants earlier access, preferred placement, private privileges,
          and a quieter tier of access held beyond the public line.
        </p>
      </div>

      <div className="px-6 py-7 md:px-8 md:py-8">
        <div className="grid gap-4 md:grid-cols-2">
          {plansLoading && (
            <>
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="h-[170px] rounded-[26px] border border-white/10 bg-white/[0.03]"
                />
              ))}
            </>
          )}

          {!plansLoading && monthlyPlan && (
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
          )}

          {!plansLoading && yearlyPlan && (
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
          )}
        </div>

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

        <button
          type="button"
          onClick={onUnlock}
          disabled={!selectedPlanData}
          className="mt-7 w-full rounded-full bg-[#b4141e]/80 px-5 py-3 text-[11px] uppercase tracking-[0.28em] text-white transition hover:bg-[#b4141e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with {selectedPlanData?.title ?? "Selected Plan"}
        </button>

        {isAdmin && (
          <AdminPricingManager plans={plans} onRefresh={onRefreshPlans} />
        )}
      </div>
    </section>
  );
}