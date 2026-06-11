"use client";

import { useCallback, useEffect, useState } from "react";
import {
  parseFoundingLeaderboardPayload,
  type FoundingLeaderboardData,
} from "@/lib/growth/founding-leaderboard";
import { supabase } from "@/lib/supabase";

const EMPTY_DATA: FoundingLeaderboardData = {
  entries: [],
  currentUser: {
    rank: null,
    points: 0,
    inTop15: false,
    profilePoints: 0,
    attendPoints: 0,
    hostPoints: 0,
    referralSignupPoints: 0,
    referralBlackcardPoints: 0,
  },
  topN: 15,
  cutoffPoints: 0,
  scoring: {
    profileComplete: 100,
    attendMeet: 10,
    hostMeet: 20,
    referralSignup: 25,
    referralBlackcard: 50,
  },
};

export function useFoundingLeaderboard(enabled: boolean) {
  const [data, setData] = useState<FoundingLeaderboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: payload, error: rpcError } = await supabase.rpc(
      "get_founding_blackcard_leaderboard",
      { p_limit: 50 },
    );

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setData(parseFoundingLeaderboardPayload((payload as Record<string, unknown> | null) ?? null));
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
