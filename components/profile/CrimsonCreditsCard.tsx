"use client";

import Link from "next/link";
import { useState } from "react";
import { CrimsonCoinIcon } from "@/components/credits/CrimsonCoinIcon";
import type { CrimsonMembershipTier } from "@/lib/membership";
import {
  CRIMSON_CREDITS_MONTHLY_EARN_CAP,
  CRIMSON_CREDITS_MONTHLY_REDEMPTION_CAP,
  formatCreditsRewardValueUsd,
} from "@/lib/credits/config";
import type { CrimsonCreditsSummary } from "@/lib/credits/types";

type Props = {
  summary: CrimsonCreditsSummary;
  loading?: boolean;
  membershipTier: CrimsonMembershipTier;
};

export function CrimsonCreditsCard({ summary, loading = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const monthlyEarnCap = summary.monthly_cap || CRIMSON_CREDITS_MONTHLY_EARN_CAP;
  const monthlyEarned = summary.monthly_earned ?? 0;
  const balance = summary.credits_balance ?? 0;
  const earnProgress = monthlyEarnCap > 0 ? Math.min(100, (monthlyEarned / monthlyEarnCap) * 100) : 0;
  const storedRewardValue = formatCreditsRewardValueUsd(balance);

  return (
    <section className="mt-3 overflow-hidden rounded-[22px] border border-[#b4141e]/25 bg-gradient-to-r from-[#120608] via-[#0b0b0d] to-[#090909] shadow-[0_16px_50px_-36px_rgba(180,20,30,0.55)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
        aria-expanded={expanded}
      >
        <CrimsonCoinIcon
          size={36}
          className="drop-shadow-[0_0_14px_rgba(180,20,30,0.45)]"
        />

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#e87a82]">
            Crimson Credits
          </p>
          <p className="mt-1 font-serif text-xl leading-none text-white">
            {loading ? "—" : `${balance.toLocaleString()} credits`}
          </p>
          <p className="mt-1 text-[10px] leading-tight tracking-[0.06em] text-zinc-500">
            {loading ? "—" : `Stored reward value ≈ ${storedRewardValue}`}
          </p>
        </div>

        <div className="flex shrink-0 items-end gap-2">
          <div className="flex items-center gap-2.5 pb-0.5">
            <div
              className="h-1.5 w-[4.25rem] overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={monthlyEarned}
              aria-valuemin={0}
              aria-valuemax={monthlyEarnCap}
              aria-label="Monthly credits earned toward earn cap"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7a1018] to-[#b4141e] transition-all duration-300"
                style={{ width: `${earnProgress}%` }}
              />
            </div>

            <Link
              href="/shop?tab=credit-rewards"
              onClick={(event) => event.stopPropagation()}
              className="group flex flex-col items-center gap-0.5"
              aria-label="Browse credit rewards in the shop"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#b4141e]/55 bg-gradient-to-b from-[#b4141e]/30 to-[#7a1018]/25 shadow-[0_0_22px_-4px_rgba(180,20,30,0.85)] transition group-hover:border-[#b4141e]/85 group-hover:shadow-[0_0_28px_-2px_rgba(180,20,30,0.95)]">
                <CrimsonCoinIcon size={20} />
              </span>
              <span className="text-[8px] font-medium uppercase tracking-[0.16em] text-[#e87a82]/90">
                Rewards
              </span>
            </Link>
          </div>

          <span
            className={`mb-1 text-lg leading-none text-zinc-500 transition ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            ⌄
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-4 py-4">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                Total stored reward value
              </p>
              <p className="mt-1 font-serif text-2xl text-white">
                {loading ? "—" : `≈ ${storedRewardValue}`}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {loading ? "—" : `From ${balance.toLocaleString()} credits — not cash`}
              </p>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                Monthly store credit redemption
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-200">
                {loading
                  ? "—"
                  : `${CRIMSON_CREDITS_MONTHLY_REDEMPTION_CAP.toLocaleString()} credits ($25) / month`}
              </p>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Monthly earned</p>
              <p className="mt-1 text-sm text-zinc-300">
                {loading ? "—" : `${monthlyEarned} / ${monthlyEarnCap} credits this month`}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm font-medium leading-6 text-[#f1c3c7]">
            Unlimited balance • $25/month rewards • Community rewards separate
          </p>
          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            Earn from meets & referrals · Credits never expire · Redeem in Shop → Credit Rewards
          </p>
        </div>
      )}
    </section>
  );
}
