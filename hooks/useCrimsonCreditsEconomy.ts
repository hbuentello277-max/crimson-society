"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_CRIMSON_CREDITS_ECONOMY,
  mergeEconomySettings,
  type CrimsonCreditsEconomySettings,
} from "@/lib/credits/economy-settings";
import { supabase } from "@/lib/supabase";

export function useCrimsonCreditsEconomy() {
  const [economy, setEconomy] = useState<CrimsonCreditsEconomySettings>(DEFAULT_CRIMSON_CREDITS_ECONOMY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("crimson_credits_economy_settings");

    if (rpcError) {
      setError(rpcError.message);
      setEconomy(DEFAULT_CRIMSON_CREDITS_ECONOMY);
      setLoading(false);
      return;
    }

    try {
      setEconomy(mergeEconomySettings(data as Record<string, unknown>));
    } catch {
      setEconomy(DEFAULT_CRIMSON_CREDITS_ECONOMY);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { economy, loading, error, refresh };
}
