import { buildSnappedRoute } from "@/lib/routing";
import { getDistanceMiles } from "@/lib/gps/distance";
import { supabase } from "@/lib/supabase";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import {
  buildNavigationStepsFromSnapped,
  parseRouteSteps,
  serializeRouteSteps,
} from "@/lib/meets/navigation/steps";
import type { NavigationStep } from "@/lib/meets/navigation/types";

export type RoutePoint = {
  lat: number;
  lng: number;
};

export type MeetRouteSource = {
  id?: string;
  host_id?: string | null;
  route?: unknown;
  route_steps?: unknown;
  meet_point_lat?: number | null;
  meet_point_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
};

export type ResolvedMeetRoute = {
  geometry: RoutePoint[];
  steps: NavigationStep[];
  provider: "saved" | "mapbox" | "osrm" | "mock" | "none";
};

const STRAIGHT_LINE_MAX_DEVIATION_METERS = 75;

export function isRoutePoint(value: unknown): value is RoutePoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "lat" in value &&
    "lng" in value &&
    typeof (value as RoutePoint).lat === "number" &&
    typeof (value as RoutePoint).lng === "number" &&
    Number.isFinite((value as RoutePoint).lat) &&
    Number.isFinite((value as RoutePoint).lng)
  );
}

export function parseRoute(value: unknown): RoutePoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRoutePoint);
}

function projectOntoSegment(
  point: RoutePoint,
  start: RoutePoint,
  end: RoutePoint,
): RoutePoint {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return start;
  }

  const ratio = Math.max(
    0,
    Math.min(1, ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) / lengthSquared),
  );

  return {
    lat: start.lat + dy * ratio,
    lng: start.lng + dx * ratio,
  };
}

function distanceMeters(from: RoutePoint, to: RoutePoint) {
  return getDistanceMiles(from, to) * 1609.344;
}

/** Max perpendicular distance from any point to the meet→destination chord. */
export function maxRouteChordDeviationMeters(route: RoutePoint[]): number {
  if (route.length < 2) return 0;

  const start = route[0];
  const end = route[route.length - 1];
  let maxDeviation = 0;

  for (const point of route) {
    const projected = projectOntoSegment(point, start, end);
    maxDeviation = Math.max(maxDeviation, distanceMeters(point, projected));
  }

  return maxDeviation;
}

/** True when geometry is only endpoints or a disguised straight segment. */
export function isNearlyStraightLineGeometry(route: RoutePoint[]) {
  if (route.length < 2) return true;
  if (route.length === 2) return true;
  return maxRouteChordDeviationMeters(route) <= STRAIGHT_LINE_MAX_DEVIATION_METERS;
}

/** Road-following geometry requires a polyline that is not a straight chord. */
export function hasRoadGeometry(route: RoutePoint[]) {
  return route.length > 2 && !isNearlyStraightLineGeometry(route);
}

export function needsRouteRepair(route: RoutePoint[]) {
  return route.length < 2 || !hasRoadGeometry(route);
}

export function endpointRouteFromRow(row: MeetRouteSource): RoutePoint[] {
  if (
    row.meet_point_lat === null ||
    row.meet_point_lat === undefined ||
    row.meet_point_lng === null ||
    row.meet_point_lng === undefined ||
    row.destination_lat === null ||
    row.destination_lat === undefined ||
    row.destination_lng === null ||
    row.destination_lng === undefined
  ) {
    return [];
  }

  return [
    { lat: row.meet_point_lat, lng: row.meet_point_lng },
    { lat: row.destination_lat, lng: row.destination_lng },
  ];
}

function emptyResolvedRoute(): ResolvedMeetRoute {
  return { geometry: [], steps: [], provider: "none" };
}

export async function resolveRouteWithSteps(row: MeetRouteSource): Promise<ResolvedMeetRoute> {
  const savedRoute = parseRoute(row.route);
  if (hasRoadGeometry(savedRoute)) {
    return {
      geometry: savedRoute,
      steps: parseRouteSteps(row.route_steps, savedRoute),
      provider: "saved",
    };
  }

  const endpoints = endpointRouteFromRow(row);
  if (endpoints.length < 2) {
    return emptyResolvedRoute();
  }

  try {
    const snapped = await buildSnappedRoute({
      origin: endpoints[0],
      destination: endpoints[1],
    });

    if (snapped.provider === "mock") {
      return emptyResolvedRoute();
    }

    const geometry = hasRoadGeometry(snapped.geometry) ? snapped.geometry : [];
    const steps =
      geometry.length > 0 ? buildNavigationStepsFromSnapped(snapped.steps, geometry) : [];

    return {
      geometry,
      steps,
      provider: snapped.provider,
    };
  } catch (error) {
    console.error("Failed to resolve meet route geometry:", error);
    return emptyResolvedRoute();
  }
}

export async function resolveRouteGeometry(row: MeetRouteSource): Promise<RoutePoint[]> {
  const resolved = await resolveRouteWithSteps(row);
  return resolved.geometry;
}

type EnsureRouteOptions = {
  persistUserId?: string | null;
  persistAsAdmin?: boolean;
};

function canPersistRepairedRoute(
  row: MeetRouteSource,
  resolved: ResolvedMeetRoute,
  options: EnsureRouteOptions,
) {
  if (!row.id || !options.persistUserId) return false;
  if (!hasRoadGeometry(resolved.geometry)) return false;
  if (resolved.provider === "mock" || resolved.provider === "none" || resolved.provider === "saved") {
    return false;
  }

  const isHost = row.host_id === options.persistUserId;
  return isHost || options.persistAsAdmin === true;
}

export async function ensureRouteGeometry(
  row: MeetRouteSource,
  options: EnsureRouteOptions = {},
): Promise<RoutePoint[]> {
  const resolved = await ensureRouteWithSteps(row, options);
  return resolved.geometry;
}

export async function ensureRouteWithSteps(
  row: MeetRouteSource,
  options: EnsureRouteOptions = {},
): Promise<ResolvedMeetRoute> {
  const savedRoute = parseRoute(row.route);
  const savedSteps = parseRouteSteps(row.route_steps, savedRoute);

  if (hasRoadGeometry(savedRoute)) {
    return {
      geometry: savedRoute,
      steps: savedSteps,
      provider: "saved",
    };
  }

  const resolved = await resolveRouteWithSteps(row);
  if (!canPersistRepairedRoute(row, resolved, options)) {
    return resolved;
  }

  let query = supabase
    .from(MEET_TABLES.meets)
    .update({
      route: resolved.geometry,
      route_steps: serializeRouteSteps(resolved.steps),
    })
    .eq("id", row.id);

  if (!options.persistAsAdmin) {
    query = query.eq("host_id", options.persistUserId!);
  }

  const { error } = await query;

  if (error) {
    console.error("Failed to persist repaired route geometry:", error);
  }

  return resolved;
}
