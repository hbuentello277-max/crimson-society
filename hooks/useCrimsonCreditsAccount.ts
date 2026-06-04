"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrimsonCreditsAccount } from "@/lib/credits/types";
import { CRIMSON_CREDITS_MONTHLY_EARN_CAP } from "@/lib/credits/config";
import { supabase } from "@/lib/supabase";

const emptyAccount: CrimsonCreditsAccount = {
  credits_balance: 0,
  lifetime_credits_earned: 0,
  lifetime_credits_spent: 0,
  monthly_earned: 0,
  monthly_cap: CRIMSON_CREDITS_MONTHLY_EARN_CAP,
};

export function useCrimsonCreditsAccount(userId: string | null | undefined) {
  const [account, setAccount] = useState<CrimsonCreditsAccount>(emptyAccount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAccount(emptyAccount);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const [summaryResult, balanceResult] = await Promise.all([
      supabase.rpc("get_crimson_credits_summary", { p_user_id: userId }),
      supabase
        .from("crimson_credits")
        .select("lifetime_credits_spent")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (summaryResult.error) {
      setError(summaryResult.error.message);
      setLoading(false);
      return;
    }

    const row = summaryResult.data as Partial<CrimsonCreditsAccount> | null;
    setAccount({
      credits_balance: row?.credits_balance ?? 0,
      lifetime_credits_earned: row?.lifetime_credits_earned ?? 0,
      lifetime_credits_spent: balanceResult.data?.lifetime_credits_spent ?? 0,
      monthly_earned: row?.monthly_earned ?? 0,
      monthly_cap: row?.monthly_cap ?? CRIMSON_CREDITS_MONTHLY_EARN_CAP,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { account, loading, error, refresh };
}
