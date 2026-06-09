"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/products";
import type { CreditsRewardBuyProduct } from "@/lib/credits/rewards-api-types";
import type { RewardActionState } from "@/lib/credits/rewards-ui";

type Props = {
  action: RewardActionState;
  onRedeem: () => void;
  onBuyNow: (buyProduct: CreditsRewardBuyProduct) => void;
  compact?: boolean;
};

export function RewardActionButtons({ action, onRedeem, onBuyNow, compact = false }: Props) {
  const buttonClass = compact
    ? "flex min-h-10 w-full items-center justify-center rounded-full text-[10px] uppercase tracking-[0.16em]"
    : "flex min-h-11 w-full items-center justify-center rounded-full px-4 text-xs uppercase tracking-[0.18em]";

  if (action.kind === "upgrade") {
    return (
      <div className="space-y-2">
        <Link
          href="/blackcard"
          className={`${buttonClass} border border-[#b4141e]/45 bg-[#b4141e]/12 text-[#f1c3c7] transition hover:border-[#b4141e]/75 hover:bg-[#b4141e]/20`}
        >
          Upgrade to Blackcard
        </Link>
        {action.buyProduct ? (
          <button
            type="button"
            onClick={() => onBuyNow(action.buyProduct!)}
            className={`${buttonClass} border border-white/20 bg-white/[0.04] text-zinc-100 transition hover:border-white/35 hover:bg-white/[0.08]`}
          >
            Buy Now · {formatPrice(action.buyProduct.price)}
          </button>
        ) : null}
        <p className="text-center text-[10px] leading-5 text-zinc-600">
          Everyone earns credits. Only Blackcard members can redeem with credits.
        </p>
      </div>
    );
  }

  if (action.kind === "buy") {
    return (
      <div className="space-y-2">
        {action.showInsufficientCredits ? (
          <p
            className={`${buttonClass} cursor-default border border-white/10 bg-white/[0.02] text-zinc-500`}
            role="status"
          >
            Not enough credits
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => onBuyNow(action.buyProduct)}
          className={`${buttonClass} border border-white/20 bg-white/[0.06] text-zinc-100 transition hover:border-white/35 hover:bg-white/[0.1]`}
        >
          Buy Now · {formatPrice(action.buyProduct.price)}
        </button>
      </div>
    );
  }

  if (action.kind === "disabled") {
    return (
      <button
        type="button"
        disabled
        className={`${buttonClass} cursor-not-allowed border border-white/10 bg-white/[0.03] text-zinc-600`}
      >
        {action.message}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onRedeem}
      className={`${buttonClass} border border-[#b4141e]/50 bg-[#b4141e]/20 text-[#f1c3c7] transition hover:border-[#b4141e]/80 hover:bg-[#b4141e]/30`}
    >
      Redeem with Credits
    </button>
  );
}
