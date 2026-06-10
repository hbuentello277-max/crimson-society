import type { NavigationMeet } from "@/lib/meets/load-navigation-meet";
import { deriveMeetLifecycle } from "@/lib/meets/lifecycle";
import { buildNavigationRoute } from "@/lib/meets/navigation/route-builder";
import { buildNavigationMetrics } from "@/lib/meets/navigation/metrics";
import {
  deriveNavigationState,
  mapGpsStateToConnection,
  type NavigationStateInput,
} from "@/lib/meets/navigation/state-machine";
import type {
  NavigationMeetContext,
  NavigationPosition,
  NavigationSession,
} from "@/lib/meets/navigation/types";
import { detectNavigationArrival } from "@/lib/meets/navigation/arrival";
import { createInitialOffRouteState } from "@/lib/meets/navigation/off-route";
import {
  applyMonotonicRouteProgress,
  computeRouteProgress,
} from "@/lib/meets/navigation/progress";
import {
  EMPTY_NAVIGATION_ARRIVAL,
  EMPTY_NAVIGATION_METRICS,
} from "@/lib/meets/navigation/types";
import type {
  NavigationArrivalSessionState,
  NavigationProgress,
  OffRouteSessionState,
} from "@/lib/meets/navigation/types";
import type { NavigationGpsState } from "@/lib/meets/use-navigation-gps";

export function buildNavigationMeetContext(
  meet: NavigationMeet,
  hostName?: string | null,
): NavigationMeetContext {
  return {
    id: meet.id,
    name: meet.name,
    hostId: meet.hostId,
    hostName: hostName ?? null,
    meetPoint: meet.meetPoint,
    destination: meet.destination,
    trackingStatus: meet.trackingStatus,
    lifecyclePhase: deriveMeetLifecycle({
      status: meet.status,
      trackingStatus: meet.trackingStatus,
      date: meet.date,
      time: meet.time,
      meetDurationMinutes: meet.meetDurationMinutes,
    }),
    distanceLabel: meet.distance,
    durationLabel: meet.duration,
  };
}

export function createInitialNavigationSession(meetId: string, userId: string): NavigationSession {
  return {
    meetId,
    userId,
    startedAt: new Date().toISOString(),
    gpsStatus: "idle",
    routeLoaded: false,
    navigationState: "loading",
    latestPosition: null,
    route: null,
    meet: null,
    progress: null,
    metrics: { ...EMPTY_NAVIGATION_METRICS },
    error: null,
    shareError: null,
    isPaused: false,
    offRoute: createInitialOffRouteState(),
    arrival: { ...EMPTY_NAVIGATION_ARRIVAL },
  };
}

function buildArrivalState(
  route: NavigationSession["route"],
  position: NavigationPosition | null,
): NavigationArrivalSessionState {
  if (!route || !position || route.points.length === 0) {
    return { ...EMPTY_NAVIGATION_ARRIVAL };
  }

  const meetStart = route.points[0];
  const destination = route.points[route.points.length - 1];
  const detection = detectNavigationArrival(position, meetStart, destination);

  let bannerMessage: string | null = null;
  if (detection.atDestination) {
    bannerMessage = "Destination reached.";
  } else if (detection.atMeetStart) {
    bannerMessage = "You've arrived at the meet start.";
  }

  return {
    atMeetStart: detection.atMeetStart,
    atDestination: detection.atDestination,
    bannerMessage,
  };
}

export function positionFromGeolocation(position: GeolocationPosition): NavigationPosition {
  const speedMph =
    typeof position.coords.speed === "number" && Number.isFinite(position.coords.speed)
      ? position.coords.speed * 2.2369362921
      : null;

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    heading:
      typeof position.coords.heading === "number" && Number.isFinite(position.coords.heading)
        ? position.coords.heading
        : null,
    speedMph,
    timestamp: position.timestamp,
  };
}

type BuildSessionInput = {
  base: NavigationSession;
  meet: NavigationMeet | null;
  hostName?: string | null;
  loadError: string | null;
  authLoading: boolean;
  gpsState: NavigationGpsState;
  gpsError: string | null;
  shareError: string | null;
  latestPosition: NavigationPosition | null;
  isPaused: boolean;
  offRoute: OffRouteSessionState;
  previousProgress: NavigationProgress | null;
};

export function buildNavigationSession(input: BuildSessionInput): NavigationSession {
  const route = input.meet ? buildNavigationRoute(input.meet) : input.base.route;
  const meetContext = input.meet
    ? buildNavigationMeetContext(input.meet, input.hostName)
    : input.base.meet;
  const routeLoaded = !!route && route.points.length > 2;

  const stateInput: NavigationStateInput = {
    authLoading: input.authLoading,
    loadError: input.loadError,
    routeLoaded,
    gpsState: input.gpsState,
    isPaused: input.isPaused,
    hasPosition: !!input.latestPosition,
  };

  const navigationState = deriveNavigationState(stateInput);
  const rawProgress =
    route && input.latestPosition
      ? computeRouteProgress(route, input.latestPosition)
      : route
        ? computeRouteProgress(route, null)
        : null;
  const progress =
    rawProgress && route
      ? applyMonotonicRouteProgress(input.previousProgress, rawProgress)
      : rawProgress;

  const metrics = buildNavigationMetrics(
    route,
    progress,
    input.latestPosition,
    input.offRoute,
  );
  const arrival = buildArrivalState(route, input.latestPosition);

  return {
    ...input.base,
    meetId: input.meet?.id ?? input.base.meetId,
    userId: input.base.userId,
    gpsStatus: mapGpsStateToConnection(input.gpsState),
    routeLoaded,
    navigationState,
    latestPosition: input.latestPosition,
    route,
    meet: meetContext,
    progress,
    metrics,
    error: input.loadError ?? input.gpsError,
    shareError: input.shareError,
    isPaused: input.isPaused,
    offRoute: input.offRoute,
    arrival,
  };
}
