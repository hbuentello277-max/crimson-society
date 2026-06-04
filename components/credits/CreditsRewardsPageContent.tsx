"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditsAccountOverview } from "@/components/credits/CreditsAccountOverview";
import { CreditsPageShell } from "@/components/credits/CreditsPageShell";
import { useCrimsonCreditsAccount } from "@/hooks/useCrimsonCreditsAccount";
import { useCurrentMembershipTier } from "@/hooks/useCurrentMembershipTier";
import { canRedeemCrimsonCredits } from "@/lib/credits/config";
import { membershipTierLabel } from "@/lib/membership";
import { supabase } from "@/lib/supabase";

const PLANNED_REWARDS = [
  "Merch discounts for Blackcard members",
  "Blackcard member perks and experiences",
  "Limited inventory access",
  "Future event and member rewards",
] as const;

export function CreditsRewardsPageContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setAuthLoading(false);
    }
    void loadUser();
  }, []);

  const { account, loading: accountLoading } = useCrimsonCreditsAccount(userId);
  const { tier, loading: tierLoading } = useCurrentMembershipTier(userId);

  const canRedeem = canRedeemCrimsonCredits(tier);
  const loading = authLoading || accountLoading || tierLoading;

  return (
    <CreditsPageShell
      title="Rewards"
      subtitle="Redemption is coming soon. Your credits are safe and tracked in your history."
    >
      <div className="rounded-2xl border border-[#b4141e]/30 bg-gradient-to-r from-[#b4141e]/10 to-transparent px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Coming soon</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Member reward redemption is in development. You can still earn and track credits today.
        </p>
      </div>

      <CreditsAccountOverview account={account} loading={loading} compact />

      <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Blackcard redemption status</p>
        <p className="mt-2 text-sm font-medium text-white">{membershipTierLabel(tier)}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {canRedeem
            ? "You’ll be able to redeem credits for member rewards soon."
            : "Upgrade to Blackcard to redeem future rewards."}
        </p>
        {!canRedeem && (
          <Link
            href="/blackcard"
            className="mt-4 inline-flex rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
          >
            Explore Blackcard
          </Link>
        )}
      </section>

      <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Planned reward uses</p>
        <ul className="mt-3 space-y-2">
          {PLANNED_REWARDS.map((item) => (
            <li
              key={item}
              className="flex gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-sm text-zinc-400"
            >
              <span className="text-[#e87a82]" aria-hidden>
                ·
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </CreditsPageShell>
  );
}
