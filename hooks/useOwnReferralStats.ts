"use client";

import { useCallback, useEffect, useState } from "react";
import type { OwnReferralStats, OwnReferredUser } from "@/lib/credits/types";
import { supabase } from "@/lib/supabase";

const emptyStats: OwnReferralStats = {
  referral_code: null,
  total_referred: 0,
  signup_rewards_earned: 0,
  blackcard_rewards_earned: 0,
  total_referral_credits_earned: 0,
  referred_users: [],
};

function parseReferredUser(raw: unknown): OwnReferredUser | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string") return null;

  return {
    id: row.id,
    username: typeof row.username === "string" ? row.username : null,
    display_name: typeof row.display_name === "string" ? row.display_name : null,
    signup_reward_awarded: row.signup_reward_awarded === true,
    blackcard_reward_awarded: row.blackcard_reward_awarded === true,
  };
}

export function useOwnReferralStats(enabled: boolean) {
  const [stats, setStats] = useState<OwnReferralStats>(emptyStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setStats(emptyStats);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("get_own_referral_stats");

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const row = (data ?? {}) as Record<string, unknown>;
    const referredRaw = Array.isArray(row.referred_users) ? row.referred_users : [];

    setStats({
      referral_code: typeof row.referral_code === "string" ? row.referral_code : null,
      total_referred: typeof row.total_referred === "number" ? row.total_referred : 0,
      signup_rewards_earned:
        typeof row.signup_rewards_earned === "number" ? row.signup_rewards_earned : 0,
      blackcard_rewards_earned:
        typeof row.blackcard_rewards_earned === "number" ? row.blackcard_rewards_earned : 0,
      total_referral_credits_earned:
        typeof row.total_referral_credits_earned === "number" ? row.total_referral_credits_earned : 0,
      referred_users: referredRaw
        .map(parseReferredUser)
        .filter((item): item is OwnReferredUser => item != null),
    });
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stats, loading, error, refresh };
}
