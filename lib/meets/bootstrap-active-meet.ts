import { supabase } from "@/lib/supabase";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import {
  ensureRouteGeometry,
  hasRoadGeometry,
  parseRoute,
} from "@/lib/meets/route-geometry";
import type { ActiveMeetSessionPayload } from "@/lib/meets/active-meet-session";
import { parseMeetTrackingStatus } from "@/lib/meets/lifecycle";

type BootstrapMeetRow = {
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

function parseWaypoints(value: unknown) {
  if (!Array.isArray(value)) return [] as ActiveMeetSessionPayload["waypoints"];

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

function sortBootstrapCandidates(a: BootstrapMeetRow, b: BootstrapMeetRow) {
  const aLive = a.tracking_status === "active" ? 1 : 0;
  const bLive = b.tracking_status === "active" ? 1 : 0;
  if (aLive !== bLive) return bLive - aLive;

  const aTime = new Date(a.started_at || `${a.date || ""}T${a.time || "00:00"}`).getTime();
  const bTime = new Date(b.started_at || `${b.date || ""}T${b.time || "00:00"}`).getTime();
  return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
}

function rowToActiveMeet(row: BootstrapMeetRow, route: { lat: number; lng: number }[]) {
  return {
    id: row.id,
    hostId: row.host_id,
    route,
    waypoints: parseWaypoints(row.waypoints),
    name: row.name?.trim() || "Active meet",
    meetPoint: row.meet_point?.trim() || "Meet point",
    destination: row.destination?.trim() || "Destination",
    trackingStatus: parseMeetTrackingStatus(row.tracking_status),
    startedAt: row.started_at,
    endedAt: row.ended_at,
  } satisfies ActiveMeetSessionPayload;
}

export async function bootstrapActiveMeetFromDb(
  userId: string,
  meetId?: string,
): Promise<ActiveMeetSessionPayload | null> {
  const selectFields =
    "id, host_id, name, meet_point, destination, route, waypoints, tracking_status, started_at, ended_at, meet_point_lat, meet_point_lng, destination_lat, destination_lng, date, time, status";

  if (meetId) {
    const { data: row, error } = await supabase
      .from(MEET_TABLES.meets)
      .select(selectFields)
      .eq("id", meetId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Failed to load meet for navigation bootstrap:", error);
      return null;
    }

    if (!row) return null;

    const route = await ensureRouteGeometry(row as BootstrapMeetRow, {
      persistForHostId: userId,
    });

    return hasRoadGeometry(route) ? rowToActiveMeet(row as BootstrapMeetRow, route) : null;
  }

  const { data: attendeeRows, error: attendeeError } = await supabase
    .from(MEET_TABLES.attendees)
    .select("ride_id")
    .eq("user_id", userId);

  if (attendeeError) {
    console.error("Failed to load meet attendance for navigation bootstrap:", attendeeError);
  }

  const attendingMeetIds = Array.from(
    new Set(((attendeeRows || []) as { ride_id: string }[]).map((row) => row.ride_id)),
  );

  const hostedQuery = supabase
    .from(MEET_TABLES.meets)
    .select(selectFields)
    .eq("status", "active")
    .eq("host_id", userId)
    .limit(20);

  const attendingQuery = attendingMeetIds.length
    ? supabase
        .from(MEET_TABLES.meets)
        .select(selectFields)
        .eq("status", "active")
        .in("id", attendingMeetIds)
        .limit(20)
    : Promise.resolve({ data: [] as BootstrapMeetRow[], error: null });

  const [{ data: hostedRows, error: hostedError }, { data: attendingRows, error: attendingError }] =
    await Promise.all([hostedQuery, attendingQuery]);

  if (hostedError) {
    console.error("Failed to load hosted meets for navigation bootstrap:", hostedError);
  }

  if (attendingError) {
    console.error("Failed to load attending meets for navigation bootstrap:", attendingError);
  }

  const uniqueCandidates = new Map<string, BootstrapMeetRow>();
  for (const row of [
    ...((hostedRows || []) as BootstrapMeetRow[]),
    ...((attendingRows || []) as BootstrapMeetRow[]),
  ]) {
    uniqueCandidates.set(row.id, row);
  }

  const candidates = Array.from(uniqueCandidates.values()).sort(sortBootstrapCandidates);

  for (const row of candidates) {
    const route = await ensureRouteGeometry(row, {
      persistForHostId: userId,
    });

    if (hasRoadGeometry(route)) {
      return rowToActiveMeet(row, route);
    }
  }

  return null;
}

export function activeMeetFromSessionPayload(
  payload: ActiveMeetSessionPayload,
): ActiveMeetSessionPayload | null {
  const route = parseRoute(payload.route);
  if (!hasRoadGeometry(route) || !payload.id) {
    return null;
  }

  return {
    ...payload,
    route,
  };
}

/** @deprecated Use bootstrapActiveMeetFromDb */
export async function bootstrapActiveRideFromDb(userId: string, meetId?: string) {
  return bootstrapActiveMeetFromDb(userId, meetId);
}

/** @deprecated Use activeMeetFromSessionPayload */
export function activeRideFromSessionPayload(payload: ActiveMeetSessionPayload) {
  return activeMeetFromSessionPayload(payload);
}
