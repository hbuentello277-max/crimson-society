"use client";

import { useEffect } from "react";
import type { NavigationSession } from "@/lib/meets/navigation/types";

type WakeLockSentinel = {
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

/**
 * Keeps the screen awake during active navigation and surfaces the next turn in the
 * document title for app-switcher glances. Does not replace OS lock-screen guidance.
 */
export function useNavigationBackgroundGuidance(session: NavigationSession) {
  const isGuidanceActive =
    session.navigationState === "navigating" && !session.isPaused && session.routeLoaded;

  useEffect(() => {
    if (!isGuidanceActive) return;

    const previousTitle = document.title;
    const { metrics } = session;
    const turn = metrics.nextTurnLabel;
    const distance = metrics.distanceToManeuverLabel;

    if (turn && turn !== "—" && distance && distance !== "—") {
      document.title = `${distance} · ${turn}`;
    } else if (turn && turn !== "—") {
      document.title = turn;
    }

    return () => {
      document.title = previousTitle;
    };
  }, [
    isGuidanceActive,
    session.metrics.distanceToManeuverLabel,
    session.metrics.nextTurnLabel,
  ]);

  useEffect(() => {
    if (!isGuidanceActive) return;
    if (typeof navigator === "undefined") return;

    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock?.request) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const requestLock = async () => {
      try {
        sentinel = await nav.wakeLock!.request("screen");
      } catch {
        // Wake Lock is optional — denied on background tabs or unsupported browsers.
      }
    };

    void requestLock();

    const handleVisibility = () => {
      if (cancelled || document.visibilityState !== "visible" || !isGuidanceActive) return;
      void requestLock();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void sentinel?.release();
    };
  }, [isGuidanceActive]);
}
