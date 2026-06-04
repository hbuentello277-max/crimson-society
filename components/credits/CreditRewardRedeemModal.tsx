"use client";

import { useEffect } from "react";
import type { CreditsRewardCatalogItem } from "@/lib/credits/rewards-api-types";
import { formatCreditsRewardValueUsd } from "@/lib/credits/config";
import { formatRewardCategoryLabel } from "@/lib/credits/rewards-ui";

type Props = {
  open: boolean;
  reward: CreditsRewardCatalogItem | null;
  shirtSize: string | null;
  balance: number;
  redeeming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function CreditRewardRedeemModal({
  open,
  reward,
  shirtSize,
  balance,
  redeeming = false,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !redeeming) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, redeeming, onClose]);

  if (!open || !reward) return null;

  const remaining = Math.max(0, balance - reward.credit_cost);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="redeem-reward-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={() => {
          if (!redeeming) onClose();
        }}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-[22px] border border-[#b4141e]/30 bg-[#0b0b0d] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)]">
        <div className="border-b border-white/8 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Confirm redemption</p>
          <h2 id="redeem-reward-title" className="mt-2 font-serif text-2xl text-white">
            {reward.title}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {formatRewardCategoryLabel(reward.reward_category)} reward ·{" "}
            {reward.credit_cost.toLocaleString()} credits
          </p>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm text-zinc-300">
          <div className="flex justify-between gap-3">
            <span className="text-zinc-500">Credit cost</span>
            <span className="font-medium text-white">{reward.credit_cost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-zinc-500">Balance after redeem</span>
            <span className="font-medium text-white">
              {remaining.toLocaleString()} credits (≈ {formatCreditsRewardValueUsd(remaining)})
            </span>
          </div>
          {shirtSize ? (
            <div className="flex justify-between gap-3">
              <span className="text-zinc-500">Shirt size</span>
              <span className="font-medium text-white">{shirtSize}</span>
            </div>
          ) : null}
          <p className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 text-xs leading-5 text-zinc-400">
            Your redemption will start as <span className="text-zinc-200">Pending</span> while our
            team processes fulfillment. Credits are deducted immediately.
          </p>
        </div>

        <div className="flex gap-2 border-t border-white/8 px-5 py-4">
          <button
            type="button"
            disabled={redeeming}
            onClick={onClose}
            className="min-h-11 flex-1 rounded-full border border-white/15 px-4 text-xs uppercase tracking-[0.18em] text-zinc-400 transition hover:border-white/25 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={redeeming}
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-full border border-[#b4141e]/50 bg-[#b4141e]/25 px-4 text-xs uppercase tracking-[0.18em] text-[#f1c3c7] transition hover:bg-[#b4141e]/35 disabled:opacity-50"
          >
            {redeeming ? "Redeeming…" : "Confirm redeem"}
          </button>
        </div>
      </div>
    </div>
  );
}
