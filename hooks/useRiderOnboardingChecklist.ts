"use client";

import { useCallback, useEffect, useState } from "react";
import {
  parseRiderOnboardingAwardPayload,
  parseRiderOnboardingRpcPayload,
  RIDER_ONBOARDING_REFRESH_EVENT,
  shouldShowOnboardingCompletionToast,
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

const ONBOARDING_TOAST_SESSION_KEY = "crimson:onboarding-completion-toast-shown";

type RefreshOptions = {
  silent?: boolean;
};

function markOnboardingToastShownInSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ONBOARDING_TOAST_SESSION_KEY, "1");
  } catch {
    // Ignore storage failures; RPC duplicate guard still prevents repeat awards.
  }
}

function hasOnboardingToastBeenShownInSession() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ONBOARDING_TOAST_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function useRiderOnboardingChecklist(enabled: boolean) {
  const [status, setStatus] = useState<RiderOnboardingStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);

  const showCompletionNotice = useCallback((rewardAmount: number) => {
    if (hasOnboardingToastBeenShownInSession()) return;
    markOnboardingToastShownInSession();
    setCompletionNotice(`Onboarding complete — +${rewardAmount} Crimson Credits earned`);
  }, []);

  const refresh = useCallback(
    async (options?: RefreshOptions) => {
      if (!enabled) {
        setLoading(false);
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }
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
          const awardPayload = parseRiderOnboardingAwardPayload(
            awardResult.data as Record<string, unknown> | null,
          );
          const refreshed = (awardResult.data as Record<string, unknown> | null)?.status as
            | Record<string, unknown>
            | undefined;
          const finalStatus = refreshed
            ? parseRiderOnboardingRpcPayload(refreshed)
            : parseRiderOnboardingRpcPayload(
                ((await supabase.rpc("get_rider_onboarding_status")).data as Record<
                  string,
                  unknown
                > | null) ?? null,
              );

          setStatus(finalStatus);

          if (shouldShowOnboardingCompletionToast(awardPayload)) {
            showCompletionNotice(finalStatus.rewardAmount);
          }
        }
      }
    },
    [enabled, showCompletionNotice],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const handleRefresh = () => {
      void refresh({ silent: true });
    };
    window.addEventListener(RIDER_ONBOARDING_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(RIDER_ONBOARDING_REFRESH_EVENT, handleRefresh);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!completionNotice) return;
    const timer = window.setTimeout(() => setCompletionNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [completionNotice]);

  const clearCompletionNotice = useCallback(() => {
    setCompletionNotice(null);
  }, []);

  return {
    status,
    loading,
    error,
    awarding,
    completionNotice,
    clearCompletionNotice,
    refresh,
  };
}
