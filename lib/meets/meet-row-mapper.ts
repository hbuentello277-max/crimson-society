import { normalizeMeetVisibility } from "@/lib/meet-visibility";
import { parseMeetStatus, parseMeetTrackingStatus } from "@/lib/meets/lifecycle";
import { profileToMeetAttendee } from "@/lib/meets/map-profile-attendee";
import { hasRoadGeometry, parseRoute } from "@/lib/meets/route-geometry";
import type {
  Meet,
  MeetRow,
  MeetType,
  MeetWaypoint,
  RoutePoint,
} from "@/lib/meets/types";

const DEFAULT_COVER = "/icon-512.png";
const DEFAULT_LAT = 29.4241;
const DEFAULT_LNG = -98.4936;

const MEET_TYPES: MeetType[] = [
  "Night Run",
  "Track Day",
  "Touring",
  "Group Ride",
  "Canyon Run",
];

export function parseMeetWaypoints(value: unknown): MeetWaypoint[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is MeetWaypoint => {
    return (
      typeof item === "object" &&
      item !== null &&
      "lat" in item &&
      "lng" in item &&
      "id" in item &&
      "label" in item &&
      typeof (item as MeetWaypoint).id === "string" &&
      typeof (item as MeetWaypoint).label === "string"
    );
  });
}

function parseMeetType(value: unknown): MeetType {
  if (typeof value === "string" && MEET_TYPES.includes(value as MeetType)) {
    return value as MeetType;
  }

  return "Group Ride";
}

function finiteCoordinate(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Maps a Supabase rides row (including pre-refactor records) into the app Meet model. */
export function mapMeetRowToMeet(row: MeetRow, resolvedRoute?: RoutePoint[]): Meet {
  const savedRoute = parseRoute(row.route);
  const route = resolvedRoute ?? (hasRoadGeometry(savedRoute) ? savedRoute : []);
  const waypoints = parseMeetWaypoints(row.waypoints);
  const host = profileToMeetAttendee(row.host);
  const coHost = row.co_host_id ? profileToMeetAttendee(row.coHost) : null;

  return {
    id: row.id,
    hostId: row.host_id,
    coHostId: row.co_host_id ?? null,
    name: row.name?.trim() || "Untitled Meet",
    date: row.date?.trim() || "",
    time: row.time?.trim() || "",
    meetPoint: row.meet_point?.trim() || "Meet point pending",
    destination: row.destination?.trim() || "Destination pending",
    city: row.city?.trim() || row.meet_point?.trim() || "Location pending",
    type: parseMeetType(row.type),
    distance: row.distance?.trim() || "TBD",
    duration: row.duration?.trim() || "TBD",
    meetDurationMinutes: row.meet_duration_minutes ?? null,
    cover: row.cover?.trim() || DEFAULT_COVER,
    host,
    coHost,
    going: row.attendeeRiders || [],
    description: row.description?.trim() || "",
    privacy: row.privacy === "Invite" || row.privacy === "Blackcard" ? row.privacy : "Open",
    visibility: normalizeMeetVisibility(row.visibility, row.privacy),
    lat: finiteCoordinate(row.meet_point_lat, DEFAULT_LAT),
    lng: finiteCoordinate(row.meet_point_lng, DEFAULT_LNG),
    destinationLat: row.destination_lat ?? null,
    destinationLng: row.destination_lng ?? null,
    route,
    waypoints,
    trackingStatus: parseMeetTrackingStatus(row.tracking_status),
    startedAt: row.started_at ?? null,
    endedAt: row.ended_at ?? null,
    status: parseMeetStatus(row.status),
  };
}

export type LegacyMeetCompatibilityIssue = {
  field: string;
  severity: "error" | "warning";
  message: string;
};

/** Static checks for whether an existing DB row can power modal, map, and navigation flows. */
export function assessLegacyMeetRowCompatibility(
  row: Record<string, unknown>,
): LegacyMeetCompatibilityIssue[] {
  const issues: LegacyMeetCompatibilityIssue[] = [];

  if (!row.id || typeof row.id !== "string") {
    issues.push({ field: "id", severity: "error", message: "Meet id is required." });
  }

  if (!row.host_id || typeof row.host_id !== "string") {
    issues.push({ field: "host_id", severity: "error", message: "Host id is required." });
  }

  const route = parseRoute(row.route);
  const hasEndpoints =
    typeof row.meet_point_lat === "number" &&
    Number.isFinite(row.meet_point_lat) &&
    typeof row.meet_point_lng === "number" &&
    Number.isFinite(row.meet_point_lng) &&
    typeof row.destination_lat === "number" &&
    Number.isFinite(row.destination_lat) &&
    typeof row.destination_lng === "number" &&
    Number.isFinite(row.destination_lng);

  if (!hasRoadGeometry(route) && !hasEndpoints) {
    issues.push({
      field: "route",
      severity: "error",
      message: "Missing road geometry and meet/destination coordinates for route repair.",
    });
  } else if (!hasRoadGeometry(route)) {
    issues.push({
      field: "route",
      severity: "warning",
      message: "Saved route is weak; navigation will attempt on-demand repair from endpoints.",
    });
  }

  if (!row.meet_point || (typeof row.meet_point === "string" && !row.meet_point.trim())) {
    issues.push({
      field: "meet_point",
      severity: "warning",
      message: "Meet point label missing; UI will use a fallback label.",
    });
  }

  if (!row.destination || (typeof row.destination === "string" && !row.destination.trim())) {
    issues.push({
      field: "destination",
      severity: "warning",
      message: "Destination label missing; UI will use a fallback label.",
    });
  }

  if (row.waypoints != null && !Array.isArray(row.waypoints)) {
    issues.push({
      field: "waypoints",
      severity: "warning",
      message: "Waypoints are not an array; they will be ignored.",
    });
  }

  if (row.co_host_id != null && row.co_host_id === row.host_id) {
    issues.push({
      field: "co_host_id",
      severity: "warning",
      message: "Co-host matches host; co-host UI will be suppressed.",
    });
  }

  return issues;
}
