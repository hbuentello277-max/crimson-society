"use client";

import { memo } from "react";
import type { NavigationSession } from "@/lib/meets/navigation/types";
import { NavigationHud } from "@/components/meets/navigation/NavigationHud";
import { NavigationMapPanel } from "@/components/meets/navigation/NavigationMapPanel";
import { NavigationTopBar } from "@/components/meets/navigation/NavigationTopBar";

type NavigationLayoutProps = {
  session: NavigationSession;
  userLocation: { lat: number; lng: number } | null;
  recenterSignal: number;
  onRecenter: () => void;
  onRetryGps: () => void;
  onTogglePause: () => void;
};

function NavigationLayoutComponent({
  session,
  userLocation,
  recenterSignal,
  onRecenter,
  onRetryGps,
  onTogglePause,
}: NavigationLayoutProps) {
  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-[#050405] text-zinc-100">
      <NavigationMapPanel
        session={session}
        userLocation={userLocation}
        recenterSignal={recenterSignal}
      />
      <NavigationTopBar session={session} />
      <NavigationHud
        session={session}
        onRecenter={onRecenter}
        onRetryGps={onRetryGps}
        onTogglePause={onTogglePause}
        canRecenter={!!userLocation}
      />
    </main>
  );
}

export const NavigationLayout = memo(NavigationLayoutComponent);
