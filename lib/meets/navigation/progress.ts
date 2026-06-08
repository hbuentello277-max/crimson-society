import { getDistanceMiles } from "@/lib/gps/distance";
import type { RoutePoint } from "@/lib/meets/route-geometry";
import type { NavigationPosition, NavigationProgress, NavigationRoute } from "@/lib/meets/navigation/types";

type NearestRouteMatch = {
  segmentIndex: number;
  routeIndex: number;
  distanceAlongMiles: number;
  distanceToRouteMiles: number;
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

function findNearestOnRoute(
  route: NavigationRoute,
  position: RoutePoint,
): NearestRouteMatch {
  let best: NearestRouteMatch = {
    segmentIndex: 0,
    routeIndex: 0,
    distanceAlongMiles: 0,
    distanceToRouteMiles: Number.POSITIVE_INFINITY,
  };

  let accumulated = 0;

  for (const segment of route.segments) {
    const projection = projectOntoSegment(position, segment.start, segment.end);
    const distanceToRouteMiles = getDistanceMiles(position, projection.point);
    const alongSegment = segment.distanceMiles * projection.ratio;
    const distanceAlongMiles = accumulated + alongSegment;

    if (distanceToRouteMiles < best.distanceToRouteMiles) {
      best = {
        segmentIndex: segment.index,
        routeIndex: segment.index + 1,
        distanceAlongMiles,
        distanceToRouteMiles,
      };
    }

    accumulated += segment.distanceMiles;
  }

  return best;
}

export function computeRouteProgress(
  route: NavigationRoute,
  position: NavigationPosition | null,
): NavigationProgress {
  const total = route.totalDistanceMiles;

  if (!position || total <= 0) {
    return {
      currentSegmentIndex: 0,
      currentRouteIndex: 0,
      distanceTraveledMiles: 0,
      distanceRemainingMiles: total,
      percentComplete: 0,
    };
  }

  const nearest = findNearestOnRoute(route, position);
  const traveled = Math.max(0, Math.min(total, nearest.distanceAlongMiles));
  const remaining = Math.max(0, total - traveled);
  const percentComplete = total > 0 ? (traveled / total) * 100 : 0;

  return {
    currentSegmentIndex: nearest.segmentIndex,
    currentRouteIndex: nearest.routeIndex,
    distanceTraveledMiles: traveled,
    distanceRemainingMiles: remaining,
    percentComplete,
  };
}

/** Minimum movement before recomputing progress (reduces rerenders). */
export const PROGRESS_RECALC_MIN_METERS = 8;

export function shouldRecalculateProgress(
  previous: NavigationPosition | null,
  next: NavigationPosition,
): boolean {
  if (!previous) return true;

  const elapsed = next.timestamp - previous.timestamp;
  if (elapsed >= 2000) return true;

  const movedMiles = getDistanceMiles(previous, next);
  return movedMiles * 1609.34 >= PROGRESS_RECALC_MIN_METERS;
}
