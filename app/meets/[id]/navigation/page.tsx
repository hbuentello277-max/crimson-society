"use client";

import { useParams } from "next/navigation";
import { NavigationErrorScreen } from "@/components/meets/navigation/NavigationErrorScreen";
import { NavigationLayout } from "@/components/meets/navigation/NavigationLayout";
import { NavigationLoadingScreen } from "@/components/meets/navigation/NavigationLoadingScreen";
import { useMeetNavigation } from "@/hooks/useMeetNavigation";

export default function MeetNavigationPage() {
  const params = useParams<{ id: string }>();
  const meetId = typeof params.id === "string" ? params.id : null;

  const {
    authLoading,
    session,
    userLocation,
    recenterSignal,
    recenter,
    retryGps,
    togglePause,
  } = useMeetNavigation(meetId);

  if (authLoading || session.navigationState === "loading") {
    return <NavigationLoadingScreen />;
  }

  if (session.navigationState === "error" || !session.routeLoaded || !session.route) {
    return (
      <NavigationErrorScreen
        message={session.error ?? "This meet does not have a valid route loaded."}
      />
    );
  }

  return (
    <NavigationLayout
      session={session}
      userLocation={userLocation}
      recenterSignal={recenterSignal}
      onRecenter={recenter}
      onRetryGps={retryGps}
      onTogglePause={togglePause}
    />
  );
}
