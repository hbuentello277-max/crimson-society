import { getDistanceMiles, getRouteDistanceMiles } from "@/lib/gps/distance";
import type { NavigationMeet } from "@/lib/meets/load-navigation-meet";
import type { RoutePoint } from "@/lib/meets/route-geometry";
import type { NavigationRoute, NavigationRouteSegment } from "@/lib/meets/navigation/types";

function buildSegments(points: RoutePoint[]): NavigationRouteSegment[] {
  const segments: NavigationRouteSegment[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    segments.push({
      index,
      start,
      end,
      distanceMiles: getDistanceMiles(start, end),
    });
  }

  return segments;
}

export function buildNavigationRoute(meet: NavigationMeet): NavigationRoute {
  const points = meet.route;
  const segments = buildSegments(points);
  const totalDistanceMiles = getRouteDistanceMiles(points);

  return {
    meetId: meet.id,
    points,
    segments,
    steps: meet.routeSteps,
    totalDistanceMiles,
    meetPoint: meet.meetPoint,
    destination: meet.destination,
    plannedDistanceLabel: meet.distance,
    plannedDurationLabel: meet.duration,
  };
}

export function formatDistanceMiles(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 0.1) return `${Math.round(value * 5280)} ft`;
  return `${value.toFixed(1)} mi`;
}

export function formatPercentComplete(value: number): string {
  const clamped = Math.max(0, Math.min(100, value));
  return `${Math.round(clamped)}%`;
}
