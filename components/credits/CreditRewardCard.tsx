"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { CreditsRewardCatalogItem } from "@/lib/credits/rewards-api-types";
import {
  CRIMSON_CREDIT_SHIRT_SIZES,
  formatRewardCategoryLabel,
  getRewardActionState,
} from "@/lib/credits/rewards-ui";
import type { CreditsRewardsSummary } from "@/lib/credits/rewards-api-types";

type Props = {
  reward: CreditsRewardCatalogItem;
  summary: CreditsRewardsSummary;
  onRedeem: (reward: CreditsRewardCatalogItem, shirtSize: string | null) => void;
};

export function CreditRewardCard({ reward, summary, onRedeem }: Props) {
  const [shirtSize, setShirtSize] = useState<string | null>(null);

  const action = getRewardActionState({
    canRedeem: summary.can_redeem,
    balance: summary.credits_balance,
    creditCost: reward.credit_cost,
    rewardCategory: reward.reward_category,
    monthlyCashUsed: summary.monthly_cash_redemption_used,
    monthlyCashCap: summary.monthly_cash_redemption_cap,
    inventoryRemaining: reward.inventory_remaining,
    requiresShirtSize: reward.requires_shirt_size,
    selectedShirtSize: shirtSize,
  });

  const limitedStock =
    reward.inventory_remaining !== null && reward.inventory_total !== null;

  return (
    <article className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.02]">
      <div className="flex gap-3 p-3.5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
          {reward.image_url ? (
            <Image
              src={reward.image_url}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              Reward
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] ${
                reward.reward_category === "cash"
                  ? "border border-amber-500/30 bg-amber-500/10 text-amber-200"
                  : "border border-sky-500/30 bg-sky-500/10 text-sky-200"
              }`}
            >
              {formatRewardCategoryLabel(reward.reward_category)}
            </span>
            {limitedStock ? (
              <span className="text-[10px] text-zinc-500">
                {reward.inventory_remaining} left
              </span>
            ) : null}
          </div>

          <h3 className="mt-1.5 font-serif text-lg leading-tight text-white">{reward.title}</h3>
          {reward.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{reward.description}</p>
          ) : null}
          <p className="mt-2 text-sm font-medium text-[#f1c3c7]">
            {reward.credit_cost.toLocaleString()} credits
          </p>
        </div>
      </div>

      {reward.requires_shirt_size ? (
        <div className="border-t border-white/8 px-3.5 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Shirt size</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CRIMSON_CREDIT_SHIRT_SIZES.map((size) => {
              const selected = shirtSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setShirtSize(size)}
                  className={`min-h-9 min-w-[2.5rem] rounded-full border px-3 text-xs font-medium transition ${
                    selected
                      ? "border-[#b4141e]/70 bg-[#b4141e]/20 text-[#f1c3c7]"
                      : "border-white/15 bg-black/20 text-zinc-400 hover:border-white/25"
                  }`}
                  aria-pressed={selected}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="border-t border-white/8 px-3.5 py-3">
        {action.kind === "upgrade" ? (
          <Link
            href="/blackcard"
            className="flex min-h-11 w-full items-center justify-center rounded-full border border-[#b4141e]/45 bg-[#b4141e]/12 px-4 text-xs uppercase tracking-[0.18em] text-[#f1c3c7] transition hover:border-[#b4141e]/75 hover:bg-[#b4141e]/20"
          >
            Upgrade to Blackcard to Redeem
          </Link>
        ) : action.kind === "disabled" ? (
          <button
            type="button"
            disabled
            className="flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-xs uppercase tracking-[0.18em] text-zinc-600"
          >
            {action.message}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRedeem(reward, shirtSize)}
            className="flex min-h-11 w-full items-center justify-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-4 text-xs uppercase tracking-[0.18em] text-[#f1c3c7] transition hover:border-[#b4141e]/80 hover:bg-[#b4141e]/30"
          >
            Redeem
          </button>
        )}
      </div>
    </article>
  );
}
