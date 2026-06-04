"use client";

import { useEffect, useState } from "react";
import { CreditRedemptionHistoryList } from "@/components/credits/CreditRedemptionHistoryList";
import { CreditRewardCard } from "@/components/credits/CreditRewardCard";
import { CreditRewardRedeemModal } from "@/components/credits/CreditRewardRedeemModal";
import { CreditsPageShell } from "@/components/credits/CreditsPageShell";
import { CreditsRewardsSummary } from "@/components/credits/CreditsRewardsSummary";
import type { CreditsRewardCatalogItem } from "@/lib/credits/rewards-api-types";
import { useCreditRewardsPage } from "@/hooks/useCreditRewardsPage";
import { supabase } from "@/lib/supabase";

type PendingRedeem = {
  reward: CreditsRewardCatalogItem;
  shirtSize: string | null;
};

export function CreditsRewardsPageContent() {
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
    redemptions,
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
      // Error surfaced via hook state
    }
  }

  return (
    <CreditsPageShell
      title="Rewards"
      subtitle="Redeem from Profile → ⋯ Menu → Rewards. Cash-value rewards count toward your monthly cash cap; community rewards do not. Shop checkout is not available yet."
    >
      {successMessage ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm leading-6 text-emerald-200">{successMessage}</p>
          <button
            type="button"
            onClick={dismissSuccess}
            className="shrink-0 text-xs uppercase tracking-[0.16em] text-emerald-300/80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm leading-6 text-red-300">{error}</p>
          <button
            type="button"
            onClick={dismissError}
            className="shrink-0 text-xs uppercase tracking-[0.16em] text-red-300/80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <CreditsRewardsSummary summary={summary} loading={pageLoading} />

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Available rewards</h2>
        <div className="mt-3 space-y-3">
          {pageLoading && rewards.length === 0 ? (
            <p className="text-sm text-zinc-500">Loading rewards…</p>
          ) : null}
          {!pageLoading && rewards.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-zinc-500">
              No rewards are available right now.
            </p>
          ) : null}
          {rewards.map((reward) => (
            <CreditRewardCard
              key={reward.id}
              reward={reward}
              summary={summary}
              onRedeem={(selected, shirtSize) => setPendingRedeem({ reward: selected, shirtSize })}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Redemption history</h2>
        <div className="mt-3">
          <CreditRedemptionHistoryList redemptions={redemptions} loading={pageLoading} />
        </div>
      </section>

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
    </CreditsPageShell>
  );
}
