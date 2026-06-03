import { supabase } from "@/lib/supabase";
import {
  ensureRouteGeometry,
  hasRoadGeometry,
  parseRoute,
} from "@/lib/rides/route-geometry";
import type { ActiveRideSessionPayload } from "@/lib/rides/active-ride-session";

type BootstrapRideRow = {
  id: string;
  host_id: string | null;
  name: string | null;
  meet_point: string | null;
  destination: string | null;
  route: unknown;
  waypoints: unknown;
  tracking_status: string | null;
  started_at: string | null;
  ended_at: string | null;
  meet_point_lat: number | null;
  meet_point_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  date: string | null;
  time: string | null;
  status: string | null;
};

function parseTrackingStatus(value: string | null | undefined) {
  return value === "active" || value === "ended" ? value : ("not_started" as const);
}

function parseWaypoints(value: unknown) {
  if (!Array.isArray(value)) return [] as ActiveRideSessionPayload["waypoints"];

  return value.filter((item) => {
    return (
      typeof item === "object" &&
      item !== null &&
      "lat" in item &&
      "lng" in item &&
      "id" in item &&
      "label" in item
    );
  });
}

function sortBootstrapCandidates(a: BootstrapRideRow, b: BootstrapRideRow) {
  const aLive = a.tracking_status === "active" ? 1 : 0;
  const bLive = b.tracking_status === "active" ? 1 : 0;
  if (aLive !== bLive) return bLive - aLive;

  const aTime = new Date(a.started_at || `${a.date || ""}T${a.time || "00:00"}`).getTime();
  const bTime = new Date(b.started_at || `${b.date || ""}T${b.time || "00:00"}`).getTime();
  return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
}

function rowToActiveRide(row: BootstrapRideRow, route: { lat: number; lng: number }[]) {
  return {
    id: row.id,
    hostId: row.host_id,
    route,
    waypoints: parseWaypoints(row.waypoints),
    name: row.name?.trim() || "Active ride",
    meetPoint: row.meet_point?.trim() || "Meet point",
    destination: row.destination?.trim() || "Destination",
    trackingStatus: parseTrackingStatus(row.tracking_status),
    startedAt: row.started_at,
    endedAt: row.ended_at,
  } satisfies ActiveRideSessionPayload;
}

export async function bootstrapActiveRideFromDb(
  userId: string,
): Promise<ActiveRideSessionPayload | null> {
  const { data: attendeeRows, error: attendeeError } = await supabase
    .from("ride_attendees")
    .select("ride_id")
    .eq("user_id", userId);

  if (attendeeError) {
    console.error("Failed to load ride attendance for tracking bootstrap:", attendeeError);
  }

  const attendingRideIds = Array.from(
    new Set(((attendeeRows || []) as { ride_id: string }[]).map((row) => row.ride_id)),
  );

  const selectFields =
    "id, host_id, name, meet_point, destination, route, waypoints, tracking_status, started_at, ended_at, meet_point_lat, meet_point_lng, destination_lat, destination_lng, date, time, status";

  const hostedQuery = supabase
    .from("rides")
    .select(selectFields)
    .eq("status", "active")
    .eq("host_id", userId)
    .limit(20);

  const attendingQuery = attendingRideIds.length
    ? supabase
        .from("rides")
        .select(selectFields)
        .eq("status", "active")
        .in("id", attendingRideIds)
        .limit(20)
    : Promise.resolve({ data: [] as BootstrapRideRow[], error: null });

  const [{ data: hostedRows, error: hostedError }, { data: attendingRows, error: attendingError }] =
    await Promise.all([hostedQuery, attendingQuery]);

  if (hostedError) {
    console.error("Failed to load hosted rides for tracking bootstrap:", hostedError);
  }

  if (attendingError) {
    console.error("Failed to load attending rides for tracking bootstrap:", attendingError);
  }

  const uniqueCandidates = new Map<string, BootstrapRideRow>();
  for (const row of [
    ...((hostedRows || []) as BootstrapRideRow[]),
    ...((attendingRows || []) as BootstrapRideRow[]),
  ]) {
    uniqueCandidates.set(row.id, row);
  }

  const candidates = Array.from(uniqueCandidates.values()).sort(sortBootstrapCandidates);

  for (const row of candidates) {
    const route = await ensureRouteGeometry(row, {
      persistForHostId: userId,
    });

    if (hasRoadGeometry(route)) {
      return rowToActiveRide(row, route);
    }
  }

  return null;
}

export function activeRideFromSessionPayload(
  payload: ActiveRideSessionPayload,
): ActiveRideSessionPayload | null {
  const route = parseRoute(payload.route);
  if (!hasRoadGeometry(route) || !payload.id) {
    return null;
  }

  return {
    ...payload,
    route,
  };
}
