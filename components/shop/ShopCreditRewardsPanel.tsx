"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditRewardImage } from "@/components/shop/CreditRewardImage";
import { CreditRewardRedeemModal } from "@/components/credits/CreditRewardRedeemModal";
import type { CreditsRewardCatalogItem } from "@/lib/credits/rewards-api-types";
import { formatRewardCategoryLabel, getRewardActionState } from "@/lib/credits/rewards-ui";
import { CRIMSON_CREDIT_SHIRT_SIZES } from "@/lib/credits/rewards-ui";
import { SizeSelectorButtons } from "@/components/shop/SizeSelectorButtons";
import { SCALAR_INVENTORY_KEY } from "@/lib/shop/inventory";
import { useCreditRewardsPage } from "@/hooks/useCreditRewardsPage";
import { supabase } from "@/lib/supabase";

type PendingRedeem = {
  reward: CreditsRewardCatalogItem;
  shirtSize: string | null;
};

export function ShopCreditRewardsPanel() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingRedeem, setPendingRedeem] = useState<PendingRedeem | null>(null);

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

  const enabled = Boolean(userId) && !authLoading;
  const {
    rewards,
    summary,
    loading,
    error,
    successMessage,
    redeeming,
    redeemReward,
    dismissSuccess,
    dismissError,
  } = useCreditRewardsPage(enabled);

  const pageLoading = authLoading || loading;

  async function handleConfirmRedeem() {
    if (!pendingRedeem) return;
    try {
      await redeemReward(pendingRedeem.reward.id, pendingRedeem.shirtSize);
      setPendingRedeem(null);
    } catch {
      // surfaced via hook
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#b4141e]/25 bg-gradient-to-br from-[#120608] via-[#0a0a0b] to-[#090909] p-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Your balance</p>
        <p className="mt-2 font-serif text-3xl text-white">
          {pageLoading ? "—" : `${summary.credits_balance.toLocaleString()} credits`}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {pageLoading ? "—" : `Stored value ${summary.stored_reward_value_usd}`}
        </p>
        <p className="mt-3 text-[10px] leading-5 text-zinc-600">
          Store credit rewards: {summary.monthly_cash_redemption_used} /{" "}
          {summary.monthly_cash_redemption_cap} credits used this month · Community rewards are
          separate
        </p>
      </div>

      {successMessage ? (
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {successMessage}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {pageLoading && rewards.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading rewards…</p>
      ) : null}

      {!pageLoading && rewards.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          No credit rewards available right now.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        {rewards.map((reward) => (
          <ShopCreditRewardCard
            key={reward.product_id}
            reward={reward}
            summary={summary}
            onRedeem={(shirtSize) => setPendingRedeem({ reward, shirtSize })}
          />
        ))}
      </div>

      <p className="text-center text-[10px] uppercase tracking-[0.22em] text-zinc-600">
        Earn credits from meets & referrals ·{" "}
        <Link href="/profile/credits/history" className="text-[#e87a82] underline-offset-2 hover:underline">
          View redemption history
        </Link>
      </p>

      <CreditRewardRedeemModal
        open={Boolean(pendingRedeem)}
        reward={pendingRedeem?.reward ?? null}
        shirtSize={pendingRedeem?.shirtSize ?? null}
        balance={summary.credits_balance}
        redeeming={redeeming}
        onConfirm={() => void handleConfirmRedeem()}
        onClose={() => {
          if (!redeeming) setPendingRedeem(null);
        }}
      />
    </div>
  );
}

function ShopCreditRewardCard({
  reward,
  summary,
  onRedeem,
}: {
  reward: CreditsRewardCatalogItem;
  summary: ReturnType<typeof useCreditRewardsPage>["summary"];
  onRedeem: (shirtSize: string | null) => void;
}) {
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
  });

  const shirtSizes = reward.requires_shirt_size
    ? reward.size_inventory
      ? Object.keys(reward.size_inventory).filter((k) => k !== SCALAR_INVENTORY_KEY)
      : [...CRIMSON_CREDIT_SHIRT_SIZES]
    : [];

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-b from-[#120608] to-black">
        <CreditRewardImage src={reward.image_url} className="object-contain p-6 opacity-95" />
        <span
          className={`absolute left-3 top-3 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] ${
            reward.reward_category === "cash"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-sky-500/30 bg-sky-500/10 text-sky-200"
          }`}
        >
          {formatRewardCategoryLabel(reward.reward_category)}
        </span>
      </div>

      <div className="p-3">
        <p className="font-serif text-base italic text-white">{reward.title}</p>
        <p className="mt-2 text-sm text-[#e87a82]">{reward.credit_cost.toLocaleString()} Credits</p>
        {reward.inventory_remaining != null ? (
          <p className="mt-1 text-[10px] text-zinc-500">{reward.inventory_remaining} left</p>
        ) : null}

        {reward.requires_shirt_size ? (
          <div className="mt-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">Shirt size</p>
            <SizeSelectorButtons
              sizes={shirtSizes.length > 0 ? shirtSizes : [...CRIMSON_CREDIT_SHIRT_SIZES]}
              sizeInventory={reward.size_inventory}
              selected={shirtSize}
              onSelect={setShirtSize}
              disabled={action.kind !== "redeem" && action.kind !== "disabled"}
            />
          </div>
        ) : null}

        <div className="mt-3">
          {action.kind === "upgrade" ? (
            <Link
              href="/blackcard"
              className="flex min-h-10 w-full items-center justify-center rounded-full border border-[#b4141e]/45 bg-[#b4141e]/12 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7]"
            >
              Upgrade to Blackcard
            </Link>
          ) : action.kind === "disabled" ? (
            <button
              type="button"
              disabled
              className="flex min-h-10 w-full cursor-not-allowed items-center justify-center rounded-full border border-white/10 text-[10px] uppercase tracking-[0.16em] text-zinc-600"
            >
              {action.message}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRedeem(shirtSize)}
              className="flex min-h-10 w-full items-center justify-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7]"
            >
              Redeem
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
