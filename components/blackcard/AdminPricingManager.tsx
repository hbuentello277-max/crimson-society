"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { MembershipPlan } from "./types";

type Props = {
  plans: MembershipPlan[];
  onRefresh: () => Promise<void>;
};

function emptyPlan(planType: "monthly" | "yearly"): MembershipPlan {
  return {
    id: "",
    plan_type: planType,
    title: planType === "monthly" ? "Monthly Plan" : "Yearly Plan",
    description:
      planType === "monthly"
        ? "Flexible entry for Blackcard Access"
        : "Preferred value with priority standing",
    price: 0,
    stripe_price_id: null,
    active: false,
    perks: [],
    created_at: null,
    updated_at: null,
  };
}

export default function AdminPricingManager({ plans, onRefresh }: Props) {
  const [formPlans, setFormPlans] = useState<Record<"monthly" | "yearly", MembershipPlan>>(
    () => ({
      monthly: plans.find((plan) => plan.plan_type === "monthly") ?? emptyPlan("monthly"),
      yearly: plans.find((plan) => plan.plan_type === "yearly") ?? emptyPlan("yearly"),
    })
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFormPlans({
        monthly: plans.find((plan) => plan.plan_type === "monthly") ?? emptyPlan("monthly"),
        yearly: plans.find((plan) => plan.plan_type === "yearly") ?? emptyPlan("yearly"),
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [plans]);

  function updatePlan(
    planType: "monthly" | "yearly",
    field: keyof MembershipPlan,
    value: string | number | boolean | string[]
  ) {
    setFormPlans((prev) => ({
      ...prev,
      [planType]: {
        ...prev[planType],
        [field]: value as never,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    const payload = (["monthly", "yearly"] as const).map((planType) => {
      const plan = formPlans[planType];
      return {
        plan_type: plan.plan_type,
        title: plan.title.trim(),
        description: plan.description.trim(),
        price: Number(plan.price),
        stripe_price_id: plan.stripe_price_id?.trim() || null,
        active: plan.active,
        perks: plan.perks.map((item) => item.trim()).filter(Boolean),
      };
    });

    const { error } = await supabase
      .from("membership_plans")
      .upsert(payload, { onConflict: "plan_type" });

    if (error) {
      setMessage("Could not save pricing changes.");
      setSaving(false);
      return;
    }

    await onRefresh();
    setMessage("Pricing updated.");
    setSaving(false);
  }

  return (
    <section className="mt-7 rounded-[28px] border border-[#b4141e]/20 bg-black/20 p-5 md:p-6">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-[#b4141e]/50" />
        <p className="text-[11px] uppercase tracking-[0.38em] text-[#e87a82]">
          Admin Pricing
        </p>
      </div>

      <h3 className="mt-3 font-serif text-2xl text-white">
        Blackcard Management
      </h3>

      <p className="mt-2 max-w-2xl text-[13px] leading-6 text-zinc-400/80">
        Update plan pricing, titles, descriptions, active states, and perks.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {(["monthly", "yearly"] as const).map((planType) => {
          const plan = formPlans[planType];

          return (
            <div
              key={planType}
              className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#e87a82]">
                {planType === "monthly" ? "Monthly" : "Yearly"}
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    Title
                  </label>
                  <input
                    value={plan.title}
                    onChange={(e) => updatePlan(planType, "title", e.target.value)}
                    className="w-full rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    Description
                  </label>
                  <textarea
                    value={plan.description}
                    onChange={(e) =>
                      updatePlan(planType, "description", e.target.value)
                    }
                    rows={3}
                    className="w-full rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={plan.price}
                    onChange={(e) =>
                      updatePlan(planType, "price", Number(e.target.value))
                    }
                    className="w-full rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    Stripe Price ID
                  </label>
                  <input
                    value={plan.stripe_price_id ?? ""}
                    onChange={(e) =>
                      updatePlan(planType, "stripe_price_id", e.target.value)
                    }
                    placeholder="price_..."
                    className="w-full rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Recurring Stripe Price ID for checkout. Leave blank to use env fallback.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    Perks (one per line)
                  </label>
                  <textarea
                    value={plan.perks.join("\n")}
                    onChange={(e) =>
                      updatePlan(planType, "perks", e.target.value.split("\n"))
                    }
                    rows={7}
                    className="w-full rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={plan.active}
                    onChange={(e) => updatePlan(planType, "active", e.target.checked)}
                    className="h-4 w-4 accent-[#b4141e]"
                  />
                  Active plan
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-[12px] text-zinc-500">{message}</p>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full border border-[#b4141e]/35 bg-[#b4141e]/10 px-5 py-2.5 text-[11px] uppercase tracking-[0.28em] text-[#f0c8cb] transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Pricing"}
        </button>
      </div>
    </section>
  );
}