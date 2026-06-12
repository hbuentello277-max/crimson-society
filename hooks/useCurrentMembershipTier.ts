"use client";

import { useCallback, useEffect, useState } from "react";
import { MEMBERSHIP_UPDATED_EVENT } from "@/lib/membership-events";
import {
  hasActiveMembership,
  resolveMembershipTier,
  type CrimsonMembershipTier,
  type MembershipRow,
} from "@/lib/membership";
import { supabase } from "@/lib/supabase";

export function useCurrentMembershipTier(userId: string | null | undefined) {
  const [tier, setTier] = useState<CrimsonMembershipTier>("free");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTier("free");
      return;
    }

    setLoading(true);

    const [{ data: profile }, { data: subscription }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "is_premium, premium_tier, premium_expires_at, is_founder_blackcard, founder_blackcard_granted_at, is_founding_blackcard, founding_blackcard_granted_at, membership_tier, blackcard_public, role",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, plan_type, current_period_end")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const membership: MembershipRow | null = subscription
      ? {
          status: subscription.status,
          plan_type: subscription.plan_type,
          current_period_end: subscription.current_period_end,
        }
      : null;

    setTier(
      resolveMembershipTier({
        membership: hasActiveMembership(membership) ? membership : null,
        isAdmin: profile?.role === "admin",
        profile: profile ?? undefined,
        blackcardPublic: profile?.blackcard_public,
      }),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onMembershipUpdated = () => {
      void refresh();
    };

    window.addEventListener(MEMBERSHIP_UPDATED_EVENT, onMembershipUpdated);
    return () => window.removeEventListener(MEMBERSHIP_UPDATED_EVENT, onMembershipUpdated);
  }, [refresh]);

  return { tier, loading, refresh };
}
