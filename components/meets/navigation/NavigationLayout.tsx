"use client";

import { memo } from "react";
import type { NavigationSession } from "@/lib/meets/navigation/types";
import { NavigationDirectionBanner } from "@/components/meets/navigation/NavigationDirectionBanner";
import { NavigationHud } from "@/components/meets/navigation/NavigationHud";
import { NavigationMapPanel } from "@/components/meets/navigation/NavigationMapPanel";
import { NavigationRidersToggle } from "@/components/meets/navigation/NavigationRidersToggle";
import { NavigationSpeedHud } from "@/components/meets/navigation/NavigationSpeedHud";
import { NavigationTopBar } from "@/components/meets/navigation/NavigationTopBar";
import type { NavigationSpeedHud as NavigationSpeedHudState } from "@/lib/meets/navigation/speed";
import type { LiveRideRider } from "@/components/MeetMap";

type NavigationLayoutProps = {
  session: NavigationSession;
  userLocation: { lat: number; lng: number } | null;
  recenterSignal: number;
  speedHud: NavigationSpeedHudState;
  liveRiders: LiveRideRider[];
  showRiders: boolean;
  onToggleShowRiders: () => void;
  onRecenter: () => void;
  onRetryGps: () => void;
  onTogglePause: () => void;
};

function NavigationLayoutComponent({
  session,
  userLocation,
  recenterSignal,
  speedHud,
  liveRiders,
  showRiders,
  onToggleShowRiders,
  onRecenter,
  onRetryGps,
  onTogglePause,
}: NavigationLayoutProps) {
  const canShowRiders = session.meet?.trackingStatus === "active";

  return (
    <main className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#050405] text-zinc-100">
      <NavigationTopBar session={session} />
      <NavigationDirectionBanner
        session={session}
        speedHud={speedHud}
        onShowRiders={() => {
          if (!showRiders) onToggleShowRiders();
        }}
      />

      <div className="relative min-h-0 flex-1">
        <NavigationMapPanel
          session={session}
          userLocation={userLocation}
          recenterSignal={recenterSignal}
          liveRiders={showRiders ? liveRiders : []}
        />
        <NavigationSpeedHud speed={speedHud} />
        <NavigationRidersToggle
          visible={canShowRiders}
          showRiders={showRiders}
          liveRiderCount={liveRiders.length}
          onToggle={onToggleShowRiders}
        />
        <NavigationHud
          session={session}
          onRecenter={onRecenter}
          onRetryGps={onRetryGps}
          onTogglePause={onTogglePause}
          canRecenter={!!userLocation}
        />
      </div>
    </main>
  );
}

export const NavigationLayout = memo(NavigationLayoutComponent);
