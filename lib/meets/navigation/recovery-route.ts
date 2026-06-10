import { getRouteDistanceMiles } from "@/lib/gps/distance";
import { buildNavigationRouteFromGeometry } from "@/lib/meets/navigation/route-builder";
import { buildNavigationStepsFromSnapped } from "@/lib/meets/navigation/steps";
import type { NavigationRoute } from "@/lib/meets/navigation/types";
import type { RoutePoint } from "@/lib/meets/route-geometry";
import { buildSnappedRoute } from "@/lib/routing";

export type RecoveryRouteStatus = "idle" | "loading" | "active" | "error";

export type RecoveryRouteState = {
  status: RecoveryRouteStatus;
  route: NavigationRoute | null;
  targetKey: string | null;
  error: string | null;
};

export const EMPTY_RECOVERY_ROUTE_STATE: RecoveryRouteState = {
  status: "idle",
  route: null,
  targetKey: null,
  error: null,
};

export function recoveryTargetKey(point: RoutePoint): string {
  return `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
}

export function shouldFetchRecoveryRoute(input: {
  offRouteStatus: string;
  rejoinPoint: RoutePoint | null;
  currentTargetKey: string | null;
  status: RecoveryRouteStatus;
}): boolean {
  if (input.offRouteStatus !== "off_route" && input.offRouteStatus !== "possibly_off_route") {
    return false;
  }

  if (!input.rejoinPoint) return false;
  if (input.status === "loading") return false;

  const nextKey = recoveryTargetKey(input.rejoinPoint);
  return input.currentTargetKey !== nextKey || input.status === "idle" || input.status === "error";
}

export async function fetchRecoveryNavigationRoute(
  meetId: string,
  origin: RoutePoint,
  rejoinPoint: RoutePoint,
): Promise<NavigationRoute | null> {
  const snapped = await buildSnappedRoute({
    origin,
    destination: rejoinPoint,
  });

  if (!snapped.geometry || snapped.geometry.length < 2) {
    return null;
  }

  const points = snapped.geometry;
  const steps = buildNavigationStepsFromSnapped(snapped.steps, points);
  const totalDistanceMiles = getRouteDistanceMiles(points);

  return buildNavigationRouteFromGeometry({
    meetId,
    points,
    steps,
    totalDistanceMiles,
    meetPoint: "Recovery",
    destination: "Rejoin route",
    plannedDistanceLabel: null,
    plannedDurationLabel: null,
  });
}
