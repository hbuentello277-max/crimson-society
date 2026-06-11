"use client";

import { AchievementBadgeIcon } from "@/components/credits/AchievementBadgeIcon";
import { CrimsonRewardsIcon } from "@/components/credits/CrimsonRewardsIcon";
import { CreditsPageShell } from "@/components/credits/CreditsPageShell";
import { useCrimsonCreditsEconomy } from "@/hooks/useCrimsonCreditsEconomy";
import { ACHIEVEMENT_MILESTONE_GROUPS } from "@/lib/credits/achievements";
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
      subtitle="Earn credits from meets and referrals, then redeem in Shop → Credit Rewards."
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
        <p className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <span>
            <span className="text-zinc-200">Blackcard</span> and{" "}
            <span className="text-zinc-200">Founding Blackcard</span> members redeem in Shop → Credit Rewards
            (tap
          </span>
          <span className="inline-flex items-center gap-1 text-zinc-200">
            <CrimsonRewardsIcon size={20} />
            Rewards
          </span>
          <span>on your profile card).</span>
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

      <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Milestone Rewards</h2>
        <p className="mt-2 text-xs leading-6 text-zinc-500">
          One-time achievement rewards. Each milestone awards once and appears in Credits History only.
        </p>

        <div className="mt-4 space-y-5">
          {ACHIEVEMENT_MILESTONE_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{group.title}</p>
              <ul className="mt-2 space-y-2">
                {group.milestones.map((milestone) => (
                  <li
                    key={milestone.label}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5"
                  >
                    <AchievementBadgeIcon className="h-8 w-8" />
                    <span className="min-w-0 flex-1 text-sm text-zinc-300">{milestone.label}</span>
                    <span className="shrink-0 text-sm font-medium text-white">
                      +{milestone.credits} credits
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </CreditsPageShell>
  );
}
