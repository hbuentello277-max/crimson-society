import { getDistanceMiles } from "@/lib/gps/distance";
import type { RoutePoint } from "@/lib/meets/route-geometry";
import type { NavigationPosition, OffRouteSessionState, OffRouteStatus } from "@/lib/meets/navigation/types";

export const OFF_ROUTE_THRESHOLD_METERS = 150;
export const RETURN_TO_ROUTE_THRESHOLD_METERS = 75;
export const OFF_ROUTE_CONFIRM_MS = 5000;
export const RETURN_TO_ROUTE_CONFIRM_MS = 3000;
export const OFF_ROUTE_MIN_SAMPLES = 2;
export const RETURN_TO_ROUTE_MIN_SAMPLES = 2;
export const BACK_ON_ROUTE_BANNER_MS = 4000;

export const OFF_ROUTE_BANNER_MESSAGE = "You may be off route.";
export const BACK_ON_ROUTE_BANNER_MESSAGE = "Back on route.";

export type RouteDeviation = {
  nearestPoint: RoutePoint;
  distanceFromRouteMeters: number;
  nearestRouteSegmentIndex: number;
  isBeyondOffRouteThreshold: boolean;
  isWithinReturnThreshold: boolean;
};

type OffRouteConfig = {
  offRouteThresholdMeters: number;
  returnThresholdMeters: number;
  offRouteConfirmMs: number;
  returnConfirmMs: number;
  offRouteMinSamples: number;
  returnMinSamples: number;
  backOnRouteBannerMs: number;
};

export const DEFAULT_OFF_ROUTE_CONFIG: OffRouteConfig = {
  offRouteThresholdMeters: OFF_ROUTE_THRESHOLD_METERS,
  returnThresholdMeters: RETURN_TO_ROUTE_THRESHOLD_METERS,
  offRouteConfirmMs: OFF_ROUTE_CONFIRM_MS,
  returnConfirmMs: RETURN_TO_ROUTE_CONFIRM_MS,
  offRouteMinSamples: OFF_ROUTE_MIN_SAMPLES,
  returnMinSamples: RETURN_TO_ROUTE_MIN_SAMPLES,
  backOnRouteBannerMs: BACK_ON_ROUTE_BANNER_MS,
};

function projectOntoSegment(
  point: RoutePoint,
  start: RoutePoint,
  end: RoutePoint,
): { point: RoutePoint; ratio: number } {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return { point: start, ratio: 0 };
  }

  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) / lengthSquared,
    ),
  );

  return {
    point: {
      lat: start.lat + dy * ratio,
      lng: start.lng + dx * ratio,
    },
    ratio,
  };
}

export function calculateRouteDeviation(
  routePoints: RoutePoint[],
  position: NavigationPosition | RoutePoint,
  config: Partial<OffRouteConfig> = {},
): RouteDeviation | null {
  if (routePoints.length < 2) return null;

  const resolved = { ...DEFAULT_OFF_ROUTE_CONFIG, ...config };
  let nearestPoint = routePoints[0];
  let nearestRouteSegmentIndex = 0;
  let distanceFromRouteMeters = Number.POSITIVE_INFINITY;

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const start = routePoints[index];
    const end = routePoints[index + 1];
    const projection = projectOntoSegment(position, start, end);
    const distanceMeters = getDistanceMiles(position, projection.point) * 1609.34;

    if (distanceMeters < distanceFromRouteMeters) {
      distanceFromRouteMeters = distanceMeters;
      nearestPoint = projection.point;
      nearestRouteSegmentIndex = index;
    }
  }

  return {
    nearestPoint,
    distanceFromRouteMeters,
    nearestRouteSegmentIndex,
    isBeyondOffRouteThreshold: distanceFromRouteMeters > resolved.offRouteThresholdMeters,
    isWithinReturnThreshold: distanceFromRouteMeters <= resolved.returnThresholdMeters,
  };
}

export function isRiderOffRoute(
  routePoints: RoutePoint[],
  position: NavigationPosition | RoutePoint,
  config: Partial<OffRouteConfig> = {},
): boolean {
  const deviation = calculateRouteDeviation(routePoints, position, config);
  return deviation?.isBeyondOffRouteThreshold ?? false;
}

export type OffRouteTracker = {
  status: OffRouteStatus;
  outsideSampleCount: number;
  insideSampleCount: number;
  outsideSince: number | null;
  insideSince: number | null;
  lastOffRouteAt: string | null;
  lastBackOnRouteAt: string | null;
  bannerMessage: string | null;
  backOnRouteBannerShownAt: number | null;
  distanceFromRouteMeters: number | null;
  nearestRouteSegmentIndex: number | null;
  nearestRejoinPoint: RoutePoint | null;
};

export function createOffRouteTracker(): OffRouteTracker {
  return {
    status: "on_route",
    outsideSampleCount: 0,
    insideSampleCount: 0,
    outsideSince: null,
    insideSince: null,
    lastOffRouteAt: null,
    lastBackOnRouteAt: null,
    bannerMessage: null,
    backOnRouteBannerShownAt: null,
    distanceFromRouteMeters: null,
    nearestRouteSegmentIndex: null,
    nearestRejoinPoint: null,
  };
}

export type { OffRouteSessionState, OffRouteStatus };

export function createInitialOffRouteState(): OffRouteSessionState {
  return {
    offRouteStatus: "on_route",
    distanceFromRouteMeters: null,
    nearestRouteSegmentIndex: null,
    nearestRejoinPoint: null,
    lastOffRouteAt: null,
    lastBackOnRouteAt: null,
    bannerMessage: null,
  };
}

function trackerToSessionState(tracker: OffRouteTracker): OffRouteSessionState {
  return {
    offRouteStatus: tracker.status,
    distanceFromRouteMeters: tracker.distanceFromRouteMeters,
    nearestRouteSegmentIndex: tracker.nearestRouteSegmentIndex,
    nearestRejoinPoint: tracker.nearestRejoinPoint,
    lastOffRouteAt: tracker.lastOffRouteAt,
    lastBackOnRouteAt: tracker.lastBackOnRouteAt,
    bannerMessage: tracker.bannerMessage,
  };
}

function statesEqual(a: OffRouteSessionState, b: OffRouteSessionState): boolean {
  return (
    a.offRouteStatus === b.offRouteStatus &&
    a.distanceFromRouteMeters === b.distanceFromRouteMeters &&
    a.nearestRouteSegmentIndex === b.nearestRouteSegmentIndex &&
    a.nearestRejoinPoint?.lat === b.nearestRejoinPoint?.lat &&
    a.nearestRejoinPoint?.lng === b.nearestRejoinPoint?.lng &&
    a.lastOffRouteAt === b.lastOffRouteAt &&
    a.lastBackOnRouteAt === b.lastBackOnRouteAt &&
    a.bannerMessage === b.bannerMessage
  );
}

function clearBackOnRouteBanner(tracker: OffRouteTracker, now: number) {
  if (
    tracker.bannerMessage === BACK_ON_ROUTE_BANNER_MESSAGE &&
    tracker.backOnRouteBannerShownAt !== null &&
    now - tracker.backOnRouteBannerShownAt >= DEFAULT_OFF_ROUTE_CONFIG.backOnRouteBannerMs
  ) {
    tracker.bannerMessage = null;
    tracker.backOnRouteBannerShownAt = null;
  }
}

function confirmOffRoute(tracker: OffRouteTracker, now: number) {
  const wasOffRoute = tracker.status === "off_route";
  tracker.status = "off_route";
  tracker.insideSampleCount = 0;
  tracker.insideSince = null;
  tracker.backOnRouteBannerShownAt = null;

  if (!wasOffRoute) {
    tracker.lastOffRouteAt = new Date(now).toISOString();
    tracker.bannerMessage = OFF_ROUTE_BANNER_MESSAGE;
  }
}

function confirmOnRoute(tracker: OffRouteTracker, now: number) {
  const wasAway = tracker.status === "off_route" || tracker.status === "returning";
  tracker.status = "on_route";
  tracker.outsideSampleCount = 0;
  tracker.outsideSince = null;

  if (wasAway) {
    tracker.lastBackOnRouteAt = new Date(now).toISOString();
    tracker.bannerMessage = BACK_ON_ROUTE_BANNER_MESSAGE;
    tracker.backOnRouteBannerShownAt = now;
  } else if (tracker.bannerMessage === OFF_ROUTE_BANNER_MESSAGE) {
    tracker.bannerMessage = null;
  }
}

export function stepOffRouteTracker(
  tracker: OffRouteTracker,
  routePoints: RoutePoint[],
  position: NavigationPosition | RoutePoint,
  now = Date.now(),
  config: Partial<OffRouteConfig> = {},
): { state: OffRouteSessionState; changed: boolean } {
  const previous = trackerToSessionState(tracker);
  const resolved = { ...DEFAULT_OFF_ROUTE_CONFIG, ...config };
  const deviation = calculateRouteDeviation(routePoints, position, resolved);

  clearBackOnRouteBanner(tracker, now);

  if (!deviation) {
    tracker.distanceFromRouteMeters = null;
    tracker.nearestRouteSegmentIndex = null;
    tracker.nearestRejoinPoint = null;
    const next = trackerToSessionState(tracker);
    return { state: next, changed: !statesEqual(previous, next) };
  }

  tracker.distanceFromRouteMeters = deviation.distanceFromRouteMeters;
  tracker.nearestRouteSegmentIndex = deviation.nearestRouteSegmentIndex;
  tracker.nearestRejoinPoint = deviation.nearestPoint;

  if (deviation.isBeyondOffRouteThreshold) {
    tracker.outsideSampleCount += 1;
    tracker.insideSampleCount = 0;
    tracker.insideSince = null;
    tracker.outsideSince = tracker.outsideSince ?? now;

    const outsideDurationMs = now - tracker.outsideSince;
    const shouldConfirmOffRoute =
      tracker.outsideSampleCount >= resolved.offRouteMinSamples ||
      outsideDurationMs >= resolved.offRouteConfirmMs;

    if (shouldConfirmOffRoute) {
      confirmOffRoute(tracker, now);
    } else if (tracker.status === "on_route" || tracker.status === "returning") {
      tracker.status = "possibly_off_route";
      if (tracker.bannerMessage === BACK_ON_ROUTE_BANNER_MESSAGE) {
        tracker.bannerMessage = null;
        tracker.backOnRouteBannerShownAt = null;
      }
    }
  } else if (deviation.isWithinReturnThreshold) {
    tracker.insideSampleCount += 1;
    tracker.outsideSampleCount = 0;
    tracker.outsideSince = null;
    tracker.insideSince = tracker.insideSince ?? now;

    const insideDurationMs = now - tracker.insideSince;
    const shouldConfirmOnRoute =
      tracker.insideSampleCount >= resolved.returnMinSamples ||
      insideDurationMs >= resolved.returnConfirmMs;

    if (tracker.status === "off_route" || tracker.status === "possibly_off_route") {
      if (shouldConfirmOnRoute) {
        confirmOnRoute(tracker, now);
      } else {
        tracker.status = "returning";
      }
    } else if (tracker.status === "returning" && shouldConfirmOnRoute) {
      confirmOnRoute(tracker, now);
    } else if (tracker.status === "on_route") {
      tracker.outsideSampleCount = 0;
      tracker.outsideSince = null;
    }
  } else {
    tracker.insideSampleCount = 0;
    tracker.insideSince = null;

    if (tracker.status === "on_route" || tracker.status === "returning") {
      tracker.outsideSampleCount = 0;
      tracker.outsideSince = null;
    }
  }

  const next = trackerToSessionState(tracker);
  return { state: next, changed: !statesEqual(previous, next) };
}

export function resetOffRouteTracker(tracker: OffRouteTracker): OffRouteSessionState {
  const reset = createOffRouteTracker();
  Object.assign(tracker, reset);
  return trackerToSessionState(tracker);
}
