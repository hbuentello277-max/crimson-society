"use client";

import { useCallback, useEffect, useState } from "react";
import {
  parseRiderOnboardingRpcPayload,
  RIDER_ONBOARDING_REFRESH_EVENT,
  type RiderOnboardingStatus,
} from "@/lib/growth/rider-checklist";
import { supabase } from "@/lib/supabase";

const EMPTY_STATUS: RiderOnboardingStatus = {
  profileComplete: false,
  rideAdded: false,
  progressPercent: 0,
  onboardingComplete: false,
  creditsAwarded: false,
  rewardAmount: 100,
};

export function useRiderOnboardingChecklist(enabled: boolean) {
  const [status, setStatus] = useState<RiderOnboardingStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("get_rider_onboarding_status");

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const nextStatus = parseRiderOnboardingRpcPayload(
      (data as Record<string, unknown> | null) ?? null,
    );
    setStatus(nextStatus);
    setLoading(false);

    if (nextStatus.onboardingComplete && !nextStatus.creditsAwarded) {
      setAwarding(true);
      const awardResult = await supabase.rpc("try_award_rider_onboarding_credits");
      setAwarding(false);

      if (!awardResult.error) {
        const awardPayload = awardResult.data as Record<string, unknown> | null;
        const refreshed = awardPayload?.status as Record<string, unknown> | undefined;
        if (refreshed) {
          setStatus(parseRiderOnboardingRpcPayload(refreshed));
        } else {
          const { data: refreshedStatus } = await supabase.rpc("get_rider_onboarding_status");
          setStatus(
            parseRiderOnboardingRpcPayload(
              (refreshedStatus as Record<string, unknown> | null) ?? null,
            ),
          );
        }
      }
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const handleRefresh = () => {
      void refresh();
    };
    window.addEventListener(RIDER_ONBOARDING_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(RIDER_ONBOARDING_REFRESH_EVENT, handleRefresh);
  }, [enabled, refresh]);

  return {
    status,
    loading,
    error,
    awarding,
    refresh,
  };
}
