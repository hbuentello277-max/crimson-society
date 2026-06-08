import { supabase } from "@/lib/supabase";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import type { ActiveMeetSessionPayload } from "@/lib/meets/active-meet-session";
import { parseMeetTrackingStatus } from "@/lib/meets/lifecycle";
import {
  ensureRouteGeometry,
  hasRoadGeometry,
  type RoutePoint,
} from "@/lib/meets/route-geometry";

type NavigationMeetRow = {
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
  distance: string | null;
  duration: string | null;
  status: string | null;
};

export type NavigationMeet = ActiveMeetSessionPayload & {
  distance: string | null;
  duration: string | null;
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

function rowToNavigationMeet(row: NavigationMeetRow, route: RoutePoint[]): NavigationMeet {
  return {
    id: row.id,
    hostId: row.host_id,
    route,
    waypoints: parseWaypoints(row.waypoints),
    name: row.name?.trim() || "Meet",
    meetPoint: row.meet_point?.trim() || "Meet point",
    destination: row.destination?.trim() || "Destination",
    trackingStatus: parseMeetTrackingStatus(row.tracking_status),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    distance: row.distance,
    duration: row.duration,
  };
}

const NAVIGATION_MEET_FIELDS =
  "id, host_id, name, meet_point, destination, route, waypoints, tracking_status, started_at, ended_at, meet_point_lat, meet_point_lng, destination_lat, destination_lng, distance, duration, status";

export function meetNavigationHref(meetId: string) {
  return `/meets/${meetId}/navigation`;
}

export async function loadNavigationMeet(
  meetId: string,
  userId?: string | null,
): Promise<{ meet: NavigationMeet | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from(MEET_TABLES.meets)
    .select(NAVIGATION_MEET_FIELDS)
    .eq("id", meetId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load meet for navigation:", error);
    return { meet: null, error: "Could not load this meet. Try again." };
  }

  if (!row) {
    return { meet: null, error: "Meet not found." };
  }

  if ((row as NavigationMeetRow).status === "canceled") {
    return { meet: null, error: "This meet was canceled." };
  }

  const route = await ensureRouteGeometry(row as NavigationMeetRow, {
    persistForHostId: userId ?? null,
  });

  if (!hasRoadGeometry(route)) {
    return {
      meet: null,
      error: "This meet does not have a valid road route yet.",
    };
  }

  return {
    meet: rowToNavigationMeet(row as NavigationMeetRow, route),
    error: null,
  };
}
