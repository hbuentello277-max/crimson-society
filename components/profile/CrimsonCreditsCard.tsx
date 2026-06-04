"use client";

import Image from "next/image";
import { useState } from "react";
import type { CrimsonMembershipTier } from "@/lib/membership";
import {
  canRedeemCrimsonCredits,
  CRIMSON_CREDITS_MONTHLY_EARN_CAP,
  formatCreditsRewardValueUsd,
} from "@/lib/credits/config";
import type { CrimsonCreditsSummary } from "@/lib/credits/types";

type Props = {
  summary: CrimsonCreditsSummary;
  loading?: boolean;
  membershipTier: CrimsonMembershipTier;
};

export function CrimsonCreditsCard({ summary, loading = false, membershipTier }: Props) {
  const [expanded, setExpanded] = useState(false);
  const monthlyCap = summary.monthly_cap || CRIMSON_CREDITS_MONTHLY_EARN_CAP;
  const monthlyEarned = summary.monthly_earned ?? 0;
  const progress = monthlyCap > 0 ? Math.min(100, (monthlyEarned / monthlyCap) * 100) : 0;
  const canRedeem = canRedeemCrimsonCredits(membershipTier);
  const rewardValue = formatCreditsRewardValueUsd(summary.credits_balance ?? 0);

  return (
    <section className="mt-3 overflow-hidden rounded-[22px] border border-[#b4141e]/25 bg-gradient-to-r from-[#120608] via-[#0b0b0d] to-[#090909] shadow-[0_16px_50px_-36px_rgba(180,20,30,0.55)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
        aria-expanded={expanded}
      >
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#b4141e]/45 bg-[radial-gradient(circle_at_30%_20%,rgba(180,20,30,0.35),rgba(0,0,0,0.85))] shadow-[0_0_24px_-10px_rgba(180,20,30,0.65)]">
          <Image
            src="/icon.png"
            alt="Crimson Society"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#e87a82]">
            Crimson Credits
          </p>
          <p className="mt-1 font-serif text-xl leading-none text-white">
            {loading ? "—" : `${monthlyEarned} / ${monthlyCap}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div
            className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={monthlyEarned}
            aria-valuemin={0}
            aria-valuemax={monthlyCap}
            aria-label="Monthly credits earned"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7a1018] to-[#b4141e] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span
            className={`text-lg leading-none text-zinc-500 transition ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            ⌄
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Estimated reward value</p>
          <p className="mt-1 font-serif text-2xl text-white">{loading ? "—" : rewardValue}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            100 Credits = $5.00 Reward Value
          </p>
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            {canRedeem
              ? "Available for Blackcard rewards"
              : "Upgrade to Blackcard to redeem rewards"}
          </p>
        </div>
      )}
    </section>
  );
}
