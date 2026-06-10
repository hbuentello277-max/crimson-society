"use client";

import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
import type { LiveRideRider } from "@/components/MeetMap";
import type { NavigationSession } from "@/lib/meets/navigation/types";

const MeetMap = dynamic(() => import("@/components/MeetMap"), {
  ssr: false,
});

type NavigationMapPanelProps = {
  session: NavigationSession;
  userLocation: { lat: number; lng: number } | null;
  recenterSignal: number;
  liveRiders?: LiveRideRider[];
};

function NavigationMapPanelComponent({
  session,
  userLocation,
  recenterSignal,
  liveRiders = [],
}: NavigationMapPanelProps) {
  const route = session.route;
  const recoveryRoute =
    session.recovery.status === "active" ? session.recovery.route?.points ?? null : null;

  const meetStart = route?.points[0] ?? null;
  const destination = route && route.points.length > 0 ? route.points[route.points.length - 1] : null;

  const mapCenter = useMemo(() => {
    return userLocation ?? meetStart ?? { lat: 29.4241, lng: -98.4936 };
  }, [meetStart, userLocation]);

  const fitPoints = useMemo(() => {
    if (!route) return undefined;
    const points = [...route.points];
    if (userLocation) points.push(userLocation);
    if (meetStart) points.push(meetStart);
    if (destination) points.push(destination);
    return points;
  }, [destination, meetStart, route, userLocation]);

  if (!route || !meetStart) return null;

  return (
    <div className="absolute inset-0">
    <MeetMap
      lat={mapCenter.lat}
      lng={mapCenter.lng}
      meetPoint={route.meetPoint}
      route={route.points}
      recoveryRoute={recoveryRoute ?? undefined}
      riders={liveRiders}
      selfLocation={userLocation}
      showSelfMarker
      compact
      interactive
      hideHint
      showMeetMarker
      meetStartPosition={meetStart}
      destinationPosition={destination}
      showDestination
      recenterSignal={recenterSignal}
      initialZoom={14}
      fitPoints={fitPoints}
    />
    </div>
  );
}

export const NavigationMapPanel = memo(NavigationMapPanelComponent);
