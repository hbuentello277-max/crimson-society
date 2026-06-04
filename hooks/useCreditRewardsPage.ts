"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CreditsRedemptionsResponse,
  CreditsRewardsCatalogResponse,
  CreditsRedeemRewardResponse,
  CreditsRewardsSummary,
} from "@/lib/credits/rewards-api-types";
import type { CrimsonCreditRedemptionRow } from "@/lib/credits/types";
import { formatCreditsRewardValueUsd } from "@/lib/credits/config";
import type { CreditsRewardCatalogItem } from "@/lib/credits/rewards-api-types";

const emptySummary: CreditsRewardsSummary = {
  credits_balance: 0,
  stored_reward_value_usd: "$0.00",
  monthly_cash_redemption_used: 0,
  monthly_cash_redemption_cap: 500,
  can_redeem: false,
};

export function useCreditRewardsPage(enabled: boolean) {
  const [rewards, setRewards] = useState<CreditsRewardCatalogItem[]>([]);
  const [summary, setSummary] = useState<CreditsRewardsSummary>(emptySummary);
  const [redemptions, setRedemptions] = useState<CrimsonCreditRedemptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const loadCatalog = useCallback(async () => {
    const response = await fetch("/api/credits/rewards", { credentials: "include" });
    const body = (await response.json()) as CreditsRewardsCatalogResponse & { error?: string };

    if (!response.ok) {
      throw new Error(body.error ?? "Could not load rewards.");
    }

    setRewards(body.rewards);
    setSummary(body.summary);
  }, []);

  const loadRedemptions = useCallback(async () => {
    const response = await fetch("/api/credits/redemptions", { credentials: "include" });
    const body = (await response.json()) as CreditsRedemptionsResponse & { error?: string };

    if (!response.ok) {
      throw new Error(body.error ?? "Could not load redemption history.");
    }

    setRedemptions(body.redemptions);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      await Promise.all([loadCatalog(), loadRedemptions()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load rewards.");
    } finally {
      setLoading(false);
    }
  }, [enabled, loadCatalog, loadRedemptions]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const redeemReward = useCallback(
    async (rewardId: string, shirtSize?: string | null) => {
      setRedeeming(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch("/api/credits/rewards/redeem", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rewardId, shirtSize: shirtSize ?? null }),
        });

        const body = (await response.json()) as CreditsRedeemRewardResponse & { error?: string };

        if (!response.ok) {
          throw new Error(body.error ?? "Redemption failed.");
        }

        setSummary((current) => ({
          ...current,
          credits_balance: body.credits_balance,
          stored_reward_value_usd: formatCreditsRewardValueUsd(body.credits_balance),
          monthly_cash_redemption_used: body.monthly_cash_redemption_used,
          monthly_cash_redemption_cap: body.monthly_cash_redemption_cap,
        }));

        setSuccessMessage(
          `${body.reward_title} redeemed for ${body.credits_spent} credits. Status: Pending.`,
        );

        await Promise.all([loadCatalog(), loadRedemptions()]);
        return body;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Redemption failed.";
        setError(message);
        throw err;
      } finally {
        setRedeeming(false);
      }
    },
    [loadCatalog, loadRedemptions],
  );

  const dismissSuccess = useCallback(() => setSuccessMessage(null), []);
  const dismissError = useCallback(() => setError(null), []);

  return {
    rewards,
    summary,
    redemptions,
    loading,
    error,
    successMessage,
    redeeming,
    refresh,
    redeemReward,
    dismissSuccess,
    dismissError,
  };
}
