"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrimsonCreditsSummary } from "@/lib/credits/types";
import { CRIMSON_CREDITS_MONTHLY_EARN_CAP } from "@/lib/credits/config";
import { supabase } from "@/lib/supabase";

const emptySummary: CrimsonCreditsSummary = {
  credits_balance: 0,
  lifetime_credits_earned: 0,
  monthly_earned: 0,
  monthly_cap: CRIMSON_CREDITS_MONTHLY_EARN_CAP,
};

export function useCrimsonCreditsSummary(userId: string | null | undefined) {
  const [summary, setSummary] = useState<CrimsonCreditsSummary>(emptySummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSummary(emptySummary);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("get_crimson_credits_summary", {
      p_user_id: userId,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const row = data as Partial<CrimsonCreditsSummary> | null;
    setSummary({
      credits_balance: row?.credits_balance ?? 0,
      lifetime_credits_earned: row?.lifetime_credits_earned ?? 0,
      monthly_earned: row?.monthly_earned ?? 0,
      monthly_cap: row?.monthly_cap ?? CRIMSON_CREDITS_MONTHLY_EARN_CAP,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}
