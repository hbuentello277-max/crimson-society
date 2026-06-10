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
import { detectNavigationArrival } from "@/lib/meets/navigation/arrival";
import {
  findNearestGroupRider,
  listNearbyGroupRiders,
  meetChatHref,
  resolveNextArrivalPhase,
} from "@/lib/meets/navigation/arrival-flow";
import {
  createInitialOffRouteState,
  createOffRouteTracker,
  resetOffRouteTracker,
  stepOffRouteTracker,
} from "@/lib/meets/navigation/off-route";
import { buildNavigationMetrics } from "@/lib/meets/navigation/metrics";
import { computeRouteProgress } from "@/lib/meets/navigation/progress";
import {
  EMPTY_RECOVERY_ROUTE_STATE,
  fetchRecoveryNavigationRoute,
  recoveryTargetKey,
  shouldFetchRecoveryRoute,
  type RecoveryRouteState,
} from "@/lib/meets/navigation/recovery-route";
import { shouldRecalculateProgress } from "@/lib/meets/navigation/progress";
import {
  EMPTY_NAVIGATION_SPEED_HUD,
  resolveCurrentSpeedMph,
  type NavigationSpeedHud,
} from "@/lib/meets/navigation/speed";
import type {
  ArrivalUiPhase,
  NavigationArrivalUiState,
  NavigationPosition,
  NavigationSession,
  OffRouteSessionState,
} from "@/lib/meets/navigation/types";
import {
  clearMeetLiveLocation,
  publishMeetLiveLocation,
} from "@/lib/meets/publish-live-location";
import { loadMeetLiveRiders } from "@/lib/meets/live-riders";
import { hasRoadGeometry } from "@/lib/meets/route-geometry";
import { useNavigationGps } from "@/lib/meets/use-navigation-gps";
import type { LiveRideRider } from "@/components/MeetMap";

type UseMeetNavigationResult = {
  authLoading: boolean;
  session: NavigationSession;
  userLocation: { lat: number; lng: number } | null;
  recenterSignal: number;
  speedHud: NavigationSpeedHud;
  liveRiders: LiveRideRider[];
  showRiders: boolean;
  toggleShowRiders: () => void;
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
  const [recovery, setRecovery] = useState<RecoveryRouteState>(EMPTY_RECOVERY_ROUTE_STATE);
  const [speedHud, setSpeedHud] = useState<NavigationSpeedHud>(EMPTY_NAVIGATION_SPEED_HUD);
  const [liveRiders, setLiveRiders] = useState<LiveRideRider[]>([]);
  const [showRiders, setShowRiders] = useState(true);
  const [arrivalUiPhase, setArrivalUiPhase] = useState<ArrivalUiPhase>("none");
  const arrivalPhaseStartedRef = useRef<number | null>(null);

  const baseSessionRef = useRef<NavigationSession | null>(null);
  const lastSentAtRef = useRef(0);
  const gpsBootstrappedRef = useRef(false);
  const latestPositionRef = useRef<NavigationPosition | null>(null);
  const offRouteTrackerRef = useRef(createOffRouteTracker());
  const previousProgressRef = useRef<NavigationSession["progress"]>(null);

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
      setSpeedHud((current) => (current.currentMph === currentMph ? current : { currentMph }));

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
      setSpeedHud(EMPTY_NAVIGATION_SPEED_HUD);
      setOffRoute(resetOffRouteTracker(offRouteTrackerRef.current));
      setRecovery(EMPTY_RECOVERY_ROUTE_STATE);
      setArrivalUiPhase("none");
      arrivalPhaseStartedRef.current = null;

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
      setRecovery(EMPTY_RECOVERY_ROUTE_STATE);
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

  useEffect(() => {
    if (!meet?.id) {
      setLiveRiders([]);
      return;
    }

    const shouldLoadRiders = meet.trackingStatus === "active" || arrivalUiPhase === "find_group";
    if (!shouldLoadRiders) {
      setLiveRiders([]);
      return;
    }

    let active = true;

    async function refreshLiveRiders() {
      const riders = await loadMeetLiveRiders(meet!.id, { excludeUserId: userId });
      if (active) {
        setLiveRiders(riders);
      }
    }

    void refreshLiveRiders();
    const interval = window.setInterval(() => {
      void refreshLiveRiders();
    }, 12_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [arrivalUiPhase, meet?.id, meet?.trackingStatus, userId]);

  useEffect(() => {
    if (!meetId || !userId || arrivalUiPhase !== "find_group") return;

    let active = true;
    const interval = window.setInterval(() => {
      void loadNavigationMeet(meetId, userId, { isAdmin }).then(({ meet: refreshed }) => {
        if (!active || !refreshed) return;
        if (refreshed.trackingStatus === "active") {
          setMeet(refreshed);
          setArrivalUiPhase("none");
          arrivalPhaseStartedRef.current = null;
        }
      });
    }, 12_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [arrivalUiPhase, isAdmin, meetId, userId]);

  useEffect(() => {
    if (offRoute.offRouteStatus === "on_route") {
      setRecovery((current) =>
        current.status === "idle" ? current : EMPTY_RECOVERY_ROUTE_STATE,
      );
    }
  }, [offRoute.offRouteStatus]);

  useEffect(() => {
    const rejoinPoint = offRoute.nearestRejoinPoint;
    if (
      !shouldFetchRecoveryRoute({
        offRouteStatus: offRoute.offRouteStatus,
        rejoinPoint,
        currentTargetKey: recovery.targetKey,
        status: recovery.status,
      })
    ) {
      return;
    }

    if (!rejoinPoint || !latestPosition || !meet?.id) return;

    let cancelled = false;
    const targetKey = recoveryTargetKey(rejoinPoint);

    setRecovery({
      status: "loading",
      route: recovery.targetKey === targetKey ? recovery.route : null,
      targetKey,
      error: null,
    });

    void fetchRecoveryNavigationRoute(meet.id, latestPosition, rejoinPoint)
      .then((route) => {
        if (cancelled) return;

        if (!route) {
          setRecovery({
            status: "error",
            route: null,
            targetKey,
            error: "Could not calculate recovery route.",
          });
          return;
        }

        setRecovery({
          status: "active",
          route,
          targetKey,
          error: null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setRecovery({
          status: "error",
          route: null,
          targetKey,
          error: "Could not calculate recovery route.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    latestPosition,
    meet?.id,
    offRoute.nearestRejoinPoint,
    offRoute.offRouteStatus,
    recovery.route,
    recovery.status,
    recovery.targetKey,
  ]);

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

    const isOffRouteGuidance =
      offRoute.offRouteStatus === "off_route" ||
      offRoute.offRouteStatus === "possibly_off_route";

    if (
      isOffRouteGuidance &&
      recovery.status === "active" &&
      recovery.route &&
      latestPosition
    ) {
      const recoveryProgress = computeRouteProgress(recovery.route, latestPosition);
      const recoveryMetrics = buildNavigationMetrics(
        recovery.route,
        recoveryProgress,
        latestPosition,
      );

      return {
        ...built,
        recovery,
        metrics: recoveryMetrics,
      };
    }

    return {
      ...built,
      recovery,
    };
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
    recovery,
    shareError,
    userId,
  ]);

  useEffect(() => {
    const route = navigationSession.route;
    if (!route || route.points.length === 0) return;

    const meetStart = route.points[0] ?? null;
    const destination = route.points[route.points.length - 1] ?? null;
    const detection = detectNavigationArrival(
      latestPosition,
      meetStart,
      destination,
    );
    const now = Date.now();

    const nextPhase = resolveNextArrivalPhase(arrivalUiPhase, {
      detection,
      trackingStatus: meet?.trackingStatus ?? "not_started",
      position: latestPosition,
      meetStart,
      now,
      phaseStartedAt: arrivalPhaseStartedRef.current,
    });

    if (nextPhase !== arrivalUiPhase) {
      if (nextPhase === "none") {
        arrivalPhaseStartedRef.current = null;
      } else if (arrivalPhaseStartedRef.current === null) {
        arrivalPhaseStartedRef.current = now;
      }
      setArrivalUiPhase(nextPhase);
    }
  }, [arrivalUiPhase, latestPosition, meet?.trackingStatus, navigationSession.route]);

  const sessionWithArrivalUi = useMemo((): NavigationSession => {
    const resolvedHostId = meet?.hostId ?? navigationSession.meet?.hostId ?? null;
    const resolvedHostName = hostName ?? navigationSession.meet?.hostName ?? null;
    const nearbyRiders =
      arrivalUiPhase === "find_group"
        ? listNearbyGroupRiders(latestPosition, liveRiders, resolvedHostId, resolvedHostName)
        : [];
    const nearestRider =
      arrivalUiPhase === "find_group"
        ? nearbyRiders[0] ??
          findNearestGroupRider(
            latestPosition,
            liveRiders,
            resolvedHostId,
            resolvedHostName,
          )
        : null;

    const arrivalUi: NavigationArrivalUiState = {
      phase: arrivalUiPhase,
      nearestRider,
      nearbyRiders,
      hostName: resolvedHostName,
      liveRiderCount: liveRiders.length,
      meetChatHref: meet?.id ? meetChatHref(meet.id) : null,
    };

    return {
      ...navigationSession,
      arrivalUi,
    };
  }, [
    arrivalUiPhase,
    hostName,
    latestPosition,
    liveRiders,
    meet?.hostId,
    meet?.id,
    navigationSession,
  ]);

  const retryGps = useCallback(() => {
    gpsBootstrappedRef.current = false;
    requestGps();
  }, [requestGps]);

  const togglePause = useCallback(() => {
    setIsPaused((value) => !value);
  }, []);

  const toggleShowRiders = useCallback(() => {
    setShowRiders((value) => !value);
  }, []);

  return {
    authLoading,
    session: sessionWithArrivalUi,
    userLocation,
    recenterSignal,
    speedHud,
    liveRiders,
    showRiders,
    toggleShowRiders,
    requestGps,
    recenter,
    retryGps,
    togglePause,
  };
}
