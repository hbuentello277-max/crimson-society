"use client";

import { useCallback, useEffect, useState } from "react";
import { MEMBERSHIP_UPDATED_EVENT } from "@/lib/membership-events";
import { hasActiveMembership, type MembershipRow } from "@/lib/membership";
import { supabase } from "@/lib/supabase";

export function useOwnMembership(userId: string | null | undefined) {
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMembership(null);
      return null;
    }

    setLoading(true);

    const { data } = await supabase
      .from("subscriptions")
      .select("status, plan_type, current_period_end, created_at, cancel_at_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .or(`current_period_end.is.null,current_period_end.gte.${new Date().toISOString()}`)
      .order("current_period_end", { ascending: false, nullsFirst: true })
      .limit(1)
      .maybeSingle();

    const row = (data as MembershipRow | null) ?? null;
    const nextMembership = hasActiveMembership(row) ? row : null;
    setMembership(nextMembership);
    setLoading(false);
    return nextMembership;
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    const onMembershipUpdated = () => {
      void refresh();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener(MEMBERSHIP_UPDATED_EVENT, onMembershipUpdated);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const channel = supabase
      .channel(`own-membership-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener(MEMBERSHIP_UPDATED_EVENT, onMembershipUpdated);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  return { membership, loading, refresh };
}
