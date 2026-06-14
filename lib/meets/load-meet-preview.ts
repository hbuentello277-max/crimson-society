import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMeetVisibility } from "@/lib/meet-visibility";
import { hasRoadGeometry, parseRoute } from "@/lib/meets/route-geometry";
import type { MeetPublicPreview } from "@/lib/meets/meet-preview-types";
import type { MeetType } from "@/lib/meets/types";

type MeetPreviewRow = {
  id: string;
  name: string | null;
  meet_date: string | null;
  meet_time: string | null;
  meet_point: string | null;
  destination: string | null;
  city: string | null;
  description: string | null;
  cover: string | null;
  distance: string | null;
  duration: string | null;
  meet_type: string | null;
  host_name: string | null;
  host_username: string | null;
  rider_count: number | string | null;
  visibility: string | null;
  status: string | null;
  is_accessible: boolean;
  can_open_in_app: boolean;
  lock_message: string | null;
  route: unknown;
  meet_point_lat: number | string | null;
  meet_point_lng: number | string | null;
  destination_lat: number | string | null;
  destination_lng: number | string | null;
};

const MEET_TYPES: MeetType[] = [
  "Night Run",
  "Track Day",
  "Touring",
  "Group Ride",
  "Canyon Run",
];

function parseMeetType(value: string | null | undefined): MeetType {
  if (value && MEET_TYPES.includes(value as MeetType)) {
    return value as MeetType;
  }
  return "Group Ride";
}

function toNumber(value: number | string | null | undefined) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCount(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapMeetPreviewRow(row: MeetPreviewRow): MeetPublicPreview {
  const route = parseRoute(row.route);
  const resolvedRoute = hasRoadGeometry(route) ? route : [];

  return {
    id: row.id,
    name: row.name?.trim() || "Private Meet on Crimson Society",
    date: row.meet_date?.trim() || "",
    time: row.meet_time?.trim() || "",
    meetPoint: row.meet_point?.trim() || "",
    destination: row.destination?.trim() || "",
    city: row.city?.trim() || "",
    description: row.description?.trim() || "",
    cover: row.cover?.trim() || "/icon-512.png",
    distance: row.distance?.trim() || "TBD",
    duration: row.duration?.trim() || "TBD",
    type: parseMeetType(row.meet_type),
    hostName: row.host_name?.trim() || "Crimson Rider",
    hostUsername: row.host_username?.trim() || null,
    riderCount: toCount(row.rider_count),
    visibility: normalizeMeetVisibility(row.visibility),
    status: row.status === "canceled" ? "canceled" : "active",
    isAccessible: row.is_accessible === true,
    canOpenInApp: row.can_open_in_app === true,
    lockMessage: row.lock_message?.trim() || null,
    route: resolvedRoute,
    lat: toNumber(row.meet_point_lat),
    lng: toNumber(row.meet_point_lng),
    destinationLat: toNumber(row.destination_lat),
    destinationLng: toNumber(row.destination_lng),
  };
}

export async function loadMeetPublicPreview(
  meetId: string,
  supabase: SupabaseClient,
): Promise<MeetPublicPreview | null> {
  const { data, error } = await supabase.rpc("get_public_meet_preview", {
    p_meet_id: meetId,
  });

  if (error) {
    console.error("Failed to load public meet preview:", error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return mapMeetPreviewRow(row as MeetPreviewRow);
}
