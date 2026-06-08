"use client";

import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
import type { NavigationSession } from "@/lib/meets/navigation/types";

const MeetMap = dynamic(() => import("@/components/MeetMap"), {
  ssr: false,
});

type NavigationMapPanelProps = {
  session: NavigationSession;
  userLocation: { lat: number; lng: number } | null;
  recenterSignal: number;
};

function NavigationMapPanelComponent({
  session,
  userLocation,
  recenterSignal,
}: NavigationMapPanelProps) {
  const route = session.route;

  const mapCenter = useMemo(() => {
    return userLocation ?? route?.points[0] ?? { lat: 29.4241, lng: -98.4936 };
  }, [route?.points, userLocation]);

  const fitPoints = useMemo(() => {
    if (!route) return undefined;
    return userLocation ? [userLocation, ...route.points] : route.points;
  }, [route, userLocation]);

  if (!route) return null;

  return (
    <MeetMap
      lat={mapCenter.lat}
      lng={mapCenter.lng}
      meetPoint={route.meetPoint}
      route={route.points}
      selfLocation={userLocation}
      showSelfMarker
      compact
      interactive
      hideHint
      showDestination={route.points.length > 1}
      recenterSignal={recenterSignal}
      initialZoom={14}
      fitPoints={fitPoints}
    />
  );
}

export const NavigationMapPanel = memo(NavigationMapPanelComponent);
