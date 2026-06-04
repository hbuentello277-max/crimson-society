"use client";

import { CreditsPageShell } from "@/components/credits/CreditsPageShell";
import { useCrimsonCreditsEconomy } from "@/hooks/useCrimsonCreditsEconomy";
import { formatCreditsRewardValueUsd } from "@/lib/credits/config";

function RuleRow({ label, value, enabled }: { label: string; value: string; enabled: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
      <span className="text-sm text-zinc-300">{label}</span>
      <span className={`text-sm font-medium ${enabled ? "text-white" : "text-zinc-600"}`}>
        {enabled ? value : "Off"}
      </span>
    </li>
  );
}

export function CreditsHowItWorksPageContent() {
  const { economy, loading, error } = useCrimsonCreditsEconomy();
  const sampleValue = formatCreditsRewardValueUsd(100);

  return (
    <CreditsPageShell
      title="How It Works"
      subtitle="Earn Crimson Credits through rides and referrals. Redemption is coming soon for Blackcard members."
    >
      {error ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Showing default earn rules. Live economy settings could not be loaded.
        </p>
      ) : null}

      <section className="space-y-3 rounded-[22px] border border-white/10 bg-white/[0.02] p-4 text-sm leading-7 text-zinc-400">
        <p>
          <span className="text-zinc-200">Free members</span> can earn Crimson Credits through meets and
          referrals.
        </p>
        <p>
          <span className="text-zinc-200">Blackcard</span> and{" "}
          <span className="text-zinc-200">Founding Blackcard</span> members can redeem credits for future
          member rewards (redemption coming soon).
        </p>
        <p>
          <span className="text-white">100 Crimson Credits</span> ≈ {sampleValue} estimated reward value.
        </p>
        <p>Credits represent reward value — not cash. Credits cannot be withdrawn or transferred.</p>
        <p>
          Monthly earn cap is currently{" "}
          <span className="text-white">{loading ? "—" : `${economy.monthly_earn_cap} credits`}</span>.
        </p>
        <p className="text-zinc-500">No Blackcard multipliers. No Founding multipliers.</p>
      </section>

      <section className="rounded-[22px] border border-[#b4141e]/20 bg-[#b4141e]/5 p-4">
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Current earn rules</h2>
        <ul className="mt-3 space-y-2">
          <RuleRow
            label="Attend Meet"
            value={`${economy.attend_meet_credits} credits`}
            enabled={economy.earn_attend_meet_enabled}
          />
          <RuleRow
            label="Host Meet"
            value={`${economy.host_meet_credits} credits`}
            enabled={economy.earn_host_meet_enabled}
          />
          <RuleRow
            label="Referral Signup"
            value={`${economy.referral_signup_credits} credits`}
            enabled={economy.earn_referral_signup_enabled}
          />
          <RuleRow
            label="Referral → Blackcard"
            value={`${economy.referral_blackcard_credits} credits`}
            enabled={economy.earn_referral_blackcard_enabled}
          />
        </ul>
        <p className="mt-4 text-xs leading-6 text-zinc-500">
          Admins may adjust credit values during beta. Past ledger history always remains unchanged.
        </p>
      </section>
    </CreditsPageShell>
  );
}
