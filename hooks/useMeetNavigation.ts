"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  readActiveMeetSession,
  writeActiveMeetSession,
} from "@/lib/meets/active-meet-session";
import { activeMeetFromSessionPayload } from "@/lib/meets/bootstrap-active-meet";
import {
  loadNavigationMeet,
  type NavigationMeet,
} from "@/lib/meets/load-navigation-meet";
import {
  buildNavigationSession,
  createInitialNavigationSession,
  positionFromGeolocation,
} from "@/lib/meets/navigation/session";
import {
  createInitialOffRouteState,
  createOffRouteTracker,
  resetOffRouteTracker,
  stepOffRouteTracker,
} from "@/lib/meets/navigation/off-route";
import { shouldRecalculateProgress } from "@/lib/meets/navigation/progress";
import {
  EMPTY_NAVIGATION_SPEED_HUD,
  resolveCurrentSpeedMph,
  updateSessionMaxSpeedMph,
  type NavigationSpeedHud,
} from "@/lib/meets/navigation/speed";
import type {
  NavigationPosition,
  NavigationSession,
  OffRouteSessionState,
} from "@/lib/meets/navigation/types";
import {
  clearMeetLiveLocation,
  publishMeetLiveLocation,
} from "@/lib/meets/publish-live-location";
import { hasRoadGeometry } from "@/lib/meets/route-geometry";
import { useNavigationGps } from "@/lib/meets/use-navigation-gps";

type UseMeetNavigationResult = {
  authLoading: boolean;
  session: NavigationSession;
  userLocation: { lat: number; lng: number } | null;
  recenterSignal: number;
  speedHud: NavigationSpeedHud;
  requestGps: () => void;
  recenter: () => void;
  retryGps: () => void;
  togglePause: () => void;
};

export function useMeetNavigation(meetId: string | null): UseMeetNavigationResult {
  const router = useRouter();
  const { session: authSession, loading: authLoading, isAdmin } = useAuth();
  const userId = authSession?.user?.id ?? null;

  const [meet, setMeet] = useState<NavigationMeet | null>(null);
  const [hostName, setHostName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [latestPosition, setLatestPosition] = useState<NavigationPosition | null>(null);
  const [offRoute, setOffRoute] = useState<OffRouteSessionState>(createInitialOffRouteState);
  const [speedHud, setSpeedHud] = useState<NavigationSpeedHud>(EMPTY_NAVIGATION_SPEED_HUD);

  const baseSessionRef = useRef<NavigationSession | null>(null);
  const lastSentAtRef = useRef(0);
  const gpsBootstrappedRef = useRef(false);
  const latestPositionRef = useRef<NavigationPosition | null>(null);
  const offRouteTrackerRef = useRef(createOffRouteTracker());
  const previousProgressRef = useRef<NavigationSession["progress"]>(null);
  const maxSpeedMphRef = useRef(0);

  if (!baseSessionRef.current && meetId && userId) {
    baseSessionRef.current = createInitialNavigationSession(meetId, userId);
  }

  const routeReady = !!meet && hasRoadGeometry(meet.route);
  const gpsEnabled = routeReady && !loadError;

  const handleGpsPosition = useCallback(
    (position: GeolocationPosition) => {
      const nextPosition = positionFromGeolocation(position);
      const previous = latestPositionRef.current;
      const currentMph = resolveCurrentSpeedMph(nextPosition, previous);
      const maxMph = updateSessionMaxSpeedMph(maxSpeedMphRef.current, currentMph);
      maxSpeedMphRef.current = maxMph;
      setSpeedHud((current) =>
        current.currentMph === currentMph && current.maxMph === maxMph
          ? current
          : { currentMph, maxMph },
      );

      if (!isPaused && meet?.route && hasRoadGeometry(meet.route)) {
        const offRouteResult = stepOffRouteTracker(
          offRouteTrackerRef.current,
          meet.route,
          nextPosition,
          nextPosition.timestamp,
        );
        if (offRouteResult.changed) {
          setOffRoute(offRouteResult.state);
        }
      }

      if (shouldRecalculateProgress(previous, nextPosition)) {
        latestPositionRef.current = nextPosition;
        setLatestPosition(nextPosition);
      }

      if (!meet?.id || !userId || meet.trackingStatus !== "active" || isPaused) return;

      void publishMeetLiveLocation({
        meetId: meet.id,
        userId,
        position,
        lastSentAtRef,
      }).then((result) => {
        if (!result.ok) {
          setShareError(result.error ?? "Could not share live location.");
        } else {
          setShareError(null);
        }
      });
    },
    [isPaused, meet?.id, meet?.route, meet?.trackingStatus, userId],
  );

  const {
    gpsState,
    userLocation,
    gpsError,
    requestGps,
    recenter,
    recenterSignal,
    clearWatch,
  } = useNavigationGps({
    enabled: gpsEnabled && !isPaused,
    onPosition: handleGpsPosition,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      router.replace("/login");
      return;
    }

    if (!meetId) {
      setLoadError("Invalid meet link.");
      return;
    }

    const resolvedMeetId = meetId;
    let cancelled = false;

    async function bootstrapMeet() {
      setLoadError(null);
      setMeet(null);
      setHostName(null);
      latestPositionRef.current = null;
      setLatestPosition(null);
      previousProgressRef.current = null;
      maxSpeedMphRef.current = 0;
      setSpeedHud(EMPTY_NAVIGATION_SPEED_HUD);
      setOffRoute(resetOffRouteTracker(offRouteTrackerRef.current));

      const sessionPayload = readActiveMeetSession();
      const sessionMeet = sessionPayload ? activeMeetFromSessionPayload(sessionPayload) : null;

      if (sessionMeet?.id === resolvedMeetId && hasRoadGeometry(sessionMeet.route)) {
        const { meet: loadedMeet, error, hostName: loadedHostName } = await loadNavigationMeet(
          resolvedMeetId,
          userId,
          { isAdmin },
        );
        if (cancelled) return;

        if (loadedMeet) {
          writeActiveMeetSession(loadedMeet);
          setMeet(loadedMeet);
          setHostName(loadedHostName);
          return;
        }

        if (error) {
          setLoadError(error);
          return;
        }
      }

      const { meet: loadedMeet, error, hostName: loadedHostName } = await loadNavigationMeet(
        resolvedMeetId,
        userId,
        { isAdmin },
      );
      if (cancelled) return;

      if (!loadedMeet) {
        setLoadError(error ?? "Could not load navigation for this meet.");
        return;
      }

      writeActiveMeetSession(loadedMeet);
      setMeet(loadedMeet);
      setHostName(loadedHostName);
    }

    void bootstrapMeet();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin, meetId, router, userId]);

  useEffect(() => {
    if (!routeReady) return;

    if (isPaused) {
      clearWatch();
      setOffRoute(resetOffRouteTracker(offRouteTrackerRef.current));
      return;
    }

    if (!gpsBootstrappedRef.current) {
      gpsBootstrappedRef.current = true;
    }

    requestGps();
  }, [clearWatch, isPaused, requestGps, routeReady]);

  useEffect(() => {
    return () => {
      clearWatch();
      if (meet?.id && userId) {
        void clearMeetLiveLocation(meet.id, userId);
      }
    };
  }, [clearWatch, meet?.id, userId]);

  const navigationSession = useMemo(() => {
    const base =
      baseSessionRef.current ??
      createInitialNavigationSession(meetId ?? "", userId ?? "");

    const built = buildNavigationSession({
      base,
      meet,
      hostName,
      loadError,
      authLoading,
      gpsState,
      gpsError,
      shareError,
      latestPosition,
      isPaused,
      offRoute,
      previousProgress: previousProgressRef.current,
    });

    if (built.progress) {
      previousProgressRef.current = built.progress;
    }

    return built;
  }, [
    authLoading,
    gpsError,
    gpsState,
    hostName,
    isPaused,
    latestPosition,
    loadError,
    meet,
    meetId,
    offRoute,
    shareError,
    userId,
  ]);

  const retryGps = useCallback(() => {
    gpsBootstrappedRef.current = false;
    requestGps();
  }, [requestGps]);

  const togglePause = useCallback(() => {
    setIsPaused((value) => !value);
  }, []);

  return {
    authLoading,
    session: navigationSession,
    userLocation,
    recenterSignal,
    speedHud,
    requestGps,
    recenter,
    retryGps,
    togglePause,
  };
}
