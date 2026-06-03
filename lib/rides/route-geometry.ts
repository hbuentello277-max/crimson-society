import { buildSnappedRoute } from "@/lib/routing";
import { supabase } from "@/lib/supabase";

export type RoutePoint = {
  lat: number;
  lng: number;
};

export type RideRouteSource = {
  id?: string;
  host_id?: string | null;
  route?: unknown;
  meet_point_lat?: number | null;
  meet_point_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
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

export function endpointRouteFromRow(row: RideRouteSource): RoutePoint[] {
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

export async function resolveRouteGeometry(row: RideRouteSource): Promise<RoutePoint[]> {
  const savedRoute = parseRoute(row.route);
  if (hasRoadGeometry(savedRoute)) {
    return savedRoute;
  }

  const endpoints = endpointRouteFromRow(row);
  if (endpoints.length < 2) {
    return [];
  }

  try {
    const snapped = await buildSnappedRoute({
      origin: endpoints[0],
      destination: endpoints[1],
    });

    return hasRoadGeometry(snapped.geometry) ? snapped.geometry : [];
  } catch (error) {
    console.error("Failed to resolve meet route geometry:", error);
    return [];
  }
}

type EnsureRouteOptions = {
  /** When true and the caller is the host, persist repaired geometry to the DB. */
  persistForHostId?: string | null;
};

export async function ensureRouteGeometry(
  row: RideRouteSource,
  options: EnsureRouteOptions = {},
): Promise<RoutePoint[]> {
  const savedRoute = parseRoute(row.route);
  if (hasRoadGeometry(savedRoute)) {
    return savedRoute;
  }

  const resolved = await resolveRouteGeometry(row);
  if (
    !hasRoadGeometry(resolved) ||
    !row.id ||
    !options.persistForHostId ||
    row.host_id !== options.persistForHostId
  ) {
    return resolved;
  }

  const { error } = await supabase
    .from("rides")
    .update({ route: resolved })
    .eq("id", row.id)
    .eq("host_id", options.persistForHostId);

  if (error) {
    console.error("Failed to persist repaired route geometry:", error);
  }

  return resolved;
}
