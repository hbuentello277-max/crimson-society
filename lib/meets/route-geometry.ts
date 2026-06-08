import { buildSnappedRoute } from "@/lib/routing";
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
};

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

/** Road-following geometry requires more than a straight meet→destination segment. */
export function hasRoadGeometry(route: RoutePoint[]) {
  return route.length > 2;
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

export async function resolveRouteWithSteps(row: MeetRouteSource): Promise<ResolvedMeetRoute> {
  const savedRoute = parseRoute(row.route);
  if (hasRoadGeometry(savedRoute)) {
    return {
      geometry: savedRoute,
      steps: parseRouteSteps(row.route_steps, savedRoute),
    };
  }

  const endpoints = endpointRouteFromRow(row);
  if (endpoints.length < 2) {
    return { geometry: [], steps: [] };
  }

  try {
    const snapped = await buildSnappedRoute({
      origin: endpoints[0],
      destination: endpoints[1],
    });

    const geometry = hasRoadGeometry(snapped.geometry) ? snapped.geometry : [];
    const steps =
      geometry.length > 2
        ? buildNavigationStepsFromSnapped(snapped.steps, geometry)
        : [];

    return { geometry, steps };
  } catch (error) {
    console.error("Failed to resolve meet route geometry:", error);
    return { geometry: [], steps: [] };
  }
}

export async function resolveRouteGeometry(row: MeetRouteSource): Promise<RoutePoint[]> {
  const resolved = await resolveRouteWithSteps(row);
  return resolved.geometry;
}

type EnsureRouteOptions = {
  persistForHostId?: string | null;
};

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
    };
  }

  const resolved = await resolveRouteWithSteps(row);
  if (
    !hasRoadGeometry(resolved.geometry) ||
    !row.id ||
    !options.persistForHostId ||
    row.host_id !== options.persistForHostId
  ) {
    return resolved;
  }

  const { error } = await supabase
    .from(MEET_TABLES.meets)
    .update({
      route: resolved.geometry,
      route_steps: serializeRouteSteps(resolved.steps),
    })
    .eq("id", row.id)
    .eq("host_id", options.persistForHostId);

  if (error) {
    console.error("Failed to persist repaired route geometry:", error);
  }

  return resolved;
}
