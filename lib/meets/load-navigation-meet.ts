import { supabase } from "@/lib/supabase";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import type { ActiveMeetSessionPayload } from "@/lib/meets/active-meet-session";
import { parseMeetStatus, parseMeetTrackingStatus } from "@/lib/meets/lifecycle";
import { parseRouteSteps } from "@/lib/meets/navigation/steps";
import type { NavigationStep } from "@/lib/meets/navigation/types";
import {
  ensureRouteWithSteps,
  hasRoadGeometry,
  type RoutePoint,
} from "@/lib/meets/route-geometry";
import type { MeetStatus } from "@/lib/meets/types";

type NavigationMeetRow = {
  id: string;
  host_id: string | null;
  name: string | null;
  meet_point: string | null;
  destination: string | null;
  route: unknown;
  route_steps: unknown;
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
  date: string | null;
  time: string | null;
  meet_duration_minutes: number | null;
};

export type NavigationMeet = ActiveMeetSessionPayload & {
  distance: string | null;
  duration: string | null;
  routeSteps: NavigationStep[];
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

function rowToNavigationMeet(
  row: NavigationMeetRow,
  route: RoutePoint[],
  routeSteps: NavigationStep[],
): NavigationMeet {
  return {
    id: row.id,
    hostId: row.host_id,
    route,
    waypoints: parseWaypoints(row.waypoints),
    name: row.name?.trim() || "Meet",
    meetPoint: row.meet_point?.trim() || "Meet point",
    destination: row.destination?.trim() || "Destination",
    date: row.date,
    time: row.time,
    meetDurationMinutes: row.meet_duration_minutes,
    status: parseMeetStatus(row.status) as MeetStatus,
    trackingStatus: parseMeetTrackingStatus(row.tracking_status),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    distance: row.distance,
    duration: row.duration,
    routeSteps,
  };
}

const NAVIGATION_MEET_FIELDS =
  "id, host_id, name, meet_point, destination, route, route_steps, waypoints, tracking_status, started_at, ended_at, meet_point_lat, meet_point_lng, destination_lat, destination_lng, distance, duration, status, date, time, meet_duration_minutes";

export function meetNavigationHref(meetId: string) {
  return `/meets/${meetId}/navigation`;
}

function resolveHostName(profile: {
  display_name?: string | null;
  full_name?: string | null;
  username?: string | null;
} | null): string | null {
  if (!profile) return null;

  return (
    profile.display_name?.trim() ||
    profile.full_name?.trim() ||
    profile.username?.trim() ||
    "Crimson Member"
  );
}

export async function loadNavigationHostName(hostId: string | null): Promise<string | null> {
  if (!hostId) return null;

  const { data, error } = await supabase
    .from("public_profiles")
    .select("display_name, full_name, username")
    .eq("id", hostId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load navigation host profile:", error);
    return null;
  }

  return resolveHostName(data);
}

export async function loadNavigationMeet(
  meetId: string,
  userId?: string | null,
): Promise<{ meet: NavigationMeet | null; error: string | null; hostName: string | null }> {
  const { data: row, error } = await supabase
    .from(MEET_TABLES.meets)
    .select(NAVIGATION_MEET_FIELDS)
    .eq("id", meetId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load meet for navigation:", error);
    return { meet: null, error: "Could not load this meet. Try again.", hostName: null };
  }

  if (!row) {
    return { meet: null, error: "Meet not found.", hostName: null };
  }

  if ((row as NavigationMeetRow).status === "canceled") {
    return { meet: null, error: "This meet was canceled.", hostName: null };
  }

  const hostName = await loadNavigationHostName((row as NavigationMeetRow).host_id);

  const resolved = await ensureRouteWithSteps(row as NavigationMeetRow, {
    persistForHostId: userId ?? null,
  });

  if (!hasRoadGeometry(resolved.geometry)) {
    return {
      meet: null,
      error: "This meet does not have a valid road route yet.",
      hostName: null,
    };
  }

  const routeSteps =
    resolved.steps.length > 0
      ? resolved.steps
      : parseRouteSteps((row as NavigationMeetRow).route_steps, resolved.geometry);

  return {
    meet: rowToNavigationMeet(row as NavigationMeetRow, resolved.geometry, routeSteps),
    error: null,
    hostName,
  };
}
