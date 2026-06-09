"use client";

import { CreditRewardImage } from "@/components/shop/CreditRewardImage";
import { useState } from "react";
import type { CreditsRewardBuyProduct, CreditsRewardCatalogItem } from "@/lib/credits/rewards-api-types";
import { SizeSelectorButtons } from "@/components/shop/SizeSelectorButtons";
import {
  CRIMSON_CREDIT_SHIRT_SIZES,
  formatRewardCategoryLabel,
  getRewardActionState,
  rewardRequiresShirtSizeForAction,
  rewardSizeInventoryForAction,
} from "@/lib/credits/rewards-ui";
import { SCALAR_INVENTORY_KEY } from "@/lib/shop/inventory";
import type { CreditsRewardsSummary } from "@/lib/credits/rewards-api-types";
import { RewardActionButtons } from "@/components/credits/RewardActionButtons";

type Props = {
  reward: CreditsRewardCatalogItem;
  summary: CreditsRewardsSummary;
  onRedeem: (reward: CreditsRewardCatalogItem, shirtSize: string | null) => void;
  onBuyNow?: (buyProduct: CreditsRewardBuyProduct, shirtSize: string | null) => void;
};

export function CreditRewardCard({ reward, summary, onRedeem, onBuyNow }: Props) {
  const [shirtSize, setShirtSize] = useState<string | null>(null);

  const action = getRewardActionState({
    canRedeem: summary.can_redeem,
    balance: summary.credits_balance,
    creditCost: reward.credit_cost,
    rewardCategory: reward.reward_category,
    monthlyCashUsed: summary.monthly_cash_redemption_used,
    monthlyCashCap: summary.monthly_cash_redemption_cap,
    inventoryRemaining: reward.inventory_remaining,
    sizeInventory: reward.size_inventory,
    requiresShirtSize: reward.requires_shirt_size,
    selectedShirtSize: shirtSize,
    buyProduct: reward.buy_product,
  });

  const requiresSize = rewardRequiresShirtSizeForAction(
    reward.requires_shirt_size,
    reward.buy_product,
    action,
  );
  const sizeInventory = rewardSizeInventoryForAction(reward.size_inventory, reward.buy_product);
  const shirtSizes = requiresSize
    ? sizeInventory
      ? Object.keys(sizeInventory).filter((k) => k !== SCALAR_INVENTORY_KEY)
      : reward.buy_product?.sizes?.length
        ? reward.buy_product.sizes
        : [...CRIMSON_CREDIT_SHIRT_SIZES]
    : [];

  const limitedStock =
    reward.inventory_remaining !== null && reward.inventory_total !== null;

  return (
    <article className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.02]">
      <div className="flex gap-3 p-3.5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#120608] to-black">
          <CreditRewardImage src={reward.image_url} className="object-contain p-2" sizes="80px" />
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

      {requiresSize ? (
        <div className="border-t border-white/8 px-3.5 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Shirt size</p>
          <div className="mt-2">
            <SizeSelectorButtons
              sizes={shirtSizes.length > 0 ? shirtSizes : [...CRIMSON_CREDIT_SHIRT_SIZES]}
              sizeInventory={sizeInventory}
              selected={shirtSize}
              onSelect={setShirtSize}
              disabled={action.kind === "disabled" && action.message !== "Select a size"}
            />
          </div>
        </div>
      ) : null}

      <div className="border-t border-white/8 px-3.5 py-3">
        <RewardActionButtons
          action={action}
          onRedeem={() => onRedeem(reward, shirtSize)}
          onBuyNow={(buyProduct) => onBuyNow?.(buyProduct, shirtSize)}
        />
      </div>
    </article>
  );
}
