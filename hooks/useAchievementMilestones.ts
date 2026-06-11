"use client";

import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const SESSION_GUARD_KEY = "crimson:achievement-milestones-checked";

export function useAchievementMilestones(userId: string | null | undefined, enabled = true) {
  const inFlightRef = useRef(false);

  const syncMilestones = useCallback(async (options?: { force?: boolean }) => {
    if (!userId || !enabled || inFlightRef.current) return false;

    if (!options?.force && typeof window !== "undefined") {
      const alreadyChecked = window.sessionStorage.getItem(SESSION_GUARD_KEY) === userId;
      if (alreadyChecked) return false;
    }

    inFlightRef.current = true;
    try {
      const { error } = await supabase.rpc("try_award_achievement_milestones");
      if (error) {
        console.error("Achievement milestone sync failed:", error.message);
        return false;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SESSION_GUARD_KEY, userId);
      }

      return true;
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, userId]);

  useEffect(() => {
    if (!userId || !enabled) return;
    void syncMilestones();
  }, [enabled, syncMilestones, userId]);

  return { syncMilestones };
}
