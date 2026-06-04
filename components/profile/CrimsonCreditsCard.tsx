"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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

function CrimsonCrownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 18h16l-1.2-7.2 2.4 2.1L12 4 8.8 12.9l2.4-2.1L4 18z"
        fill="currentColor"
        fillOpacity="0.92"
      />
      <path
        d="M5 19.5h14"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
    </svg>
  );
}

function CreditsBrandMark() {
  const [useCrown, setUseCrown] = useState(false);

  if (useCrown) {
    return (
      <CrimsonCrownIcon className="h-9 w-9 shrink-0 text-[#b4141e] drop-shadow-[0_0_14px_rgba(180,20,30,0.45)]" />
    );
  }

  return (
    <Image
      src="/icon.png"
      alt=""
      width={40}
      height={40}
      className="h-9 w-auto max-w-[2.75rem] shrink-0 object-contain object-left drop-shadow-[0_0_12px_rgba(180,20,30,0.35)]"
      onError={() => setUseCrown(true)}
    />
  );
}

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
        <CreditsBrandMark />

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

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div
            className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10"
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
          <span
            className={`text-lg leading-none text-zinc-500 transition ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            ⌄
          </span>
        </div>
      </button>

      <div className="border-t border-white/8 px-4 py-3">
        <Link
          href="/shop?tab=credit-rewards"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#b4141e]/50 bg-gradient-to-r from-[#b4141e]/25 to-[#7a1018]/20 px-5 py-3 text-sm font-medium tracking-[0.12em] text-[#f5d0d4] shadow-[0_0_24px_-8px_rgba(180,20,30,0.55)] transition hover:border-[#b4141e]/80 hover:from-[#b4141e]/35"
        >
          <span aria-hidden>👑</span>
          <span className="uppercase">Rewards</span>
        </Link>
      </div>

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
                Monthly cash redemption
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
            Unlimited balance • $25/month cash rewards • Community rewards separate
          </p>
          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            Earn from meets & referrals · Credits never expire · Redeem in Shop → Credit Rewards
          </p>
        </div>
      )}
    </section>
  );
}
