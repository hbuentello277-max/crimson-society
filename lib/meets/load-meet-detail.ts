import { supabase } from "@/lib/supabase";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import { MEET_LIST_SELECT } from "@/lib/meets/list-query";
import { mapMeetRowToMeet } from "@/lib/meets/meet-row-mapper";
import { profileToMeetAttendee } from "@/lib/meets/map-profile-attendee";
import {
  endpointRouteFromRow,
  hasRoadGeometry,
  parseRoute,
  type RoutePoint,
} from "@/lib/meets/route-geometry";
import type { Meet, MeetAttendee, MeetRow } from "@/lib/meets/types";

const MEET_DETAIL_ROUTE_FIELDS = "route, route_steps, waypoints";

export const MEET_DETAIL_SELECT = `${MEET_LIST_SELECT}, ${MEET_DETAIL_ROUTE_FIELDS}`;

const DEFAULT_HOST_PHOTO = "/icon-192.png";

function resolveMeetDetailRoute(row: MeetRow): RoutePoint[] {
  const savedRoute = parseRoute(row.route);
  if (hasRoadGeometry(savedRoute)) {
    return savedRoute;
  }

  const endpointRoute = endpointRouteFromRow(row);
  if (endpointRoute.length >= 2) {
    return endpointRoute;
  }

  return savedRoute.length >= 2 ? savedRoute : [];
}

export function mapMeetDetailRow(
  row: MeetRow & {
    host?: MeetRow["host"];
    coHost?: MeetRow["coHost"];
    attendeeRiders?: MeetAttendee[];
  },
): Meet {
  const resolvedRoute = resolveMeetDetailRoute(row);
  return mapMeetRowToMeet(row, resolvedRoute.length > 0 ? resolvedRoute : undefined);
}

export async function loadMeetDetailForModal(meetId: string): Promise<Meet | null> {
  const { data: row, error } = await supabase
    .from(MEET_TABLES.meets)
    .select(MEET_DETAIL_SELECT)
    .eq("id", meetId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load meet detail:", error);
    return null;
  }

  if (!row) return null;

  const typedRow = row as unknown as MeetRow;
  const profileIds = [typedRow.host_id, typedRow.co_host_id].filter(Boolean) as string[];

  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase
        .from("public_profiles")
        .select("id, username, display_name, full_name, profile_image_url, avatar_url")
        .in("id", profileIds)
    : { data: [], error: null };

  if (profilesError) {
    console.error("Failed to load meet detail profiles:", profilesError);
  }

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

  const { data: attendeeRows, error: attendeeError } = await supabase
    .from(MEET_TABLES.attendees)
    .select("user_id")
    .eq("ride_id", meetId);

  if (attendeeError) {
    console.error("Failed to load meet detail attendees:", attendeeError);
  }

  const attendeeIds = Array.from(
    new Set((attendeeRows || []).map((row) => row.user_id).filter(Boolean)),
  ) as string[];

  type ProfileRow = NonNullable<MeetRow["host"]>;
  let attendeeProfiles = new Map<string, ProfileRow>();
  if (attendeeIds.length > 0) {
    const { data: attendeeProfileRows, error: attendeeProfilesError } = await supabase
      .from("public_profiles")
      .select("id, username, display_name, full_name, profile_image_url, avatar_url")
      .in("id", attendeeIds);

    if (attendeeProfilesError) {
      console.error("Failed to load meet detail attendee profiles:", attendeeProfilesError);
    } else {
      attendeeProfiles = new Map((attendeeProfileRows || []).map((profile) => [profile.id, profile]));
    }
  }

  const attendeeRiders: MeetAttendee[] = attendeeIds.map((userId) => {
    const profile = attendeeProfiles.get(userId);
    return profile
      ? profileToMeetAttendee(profile)
      : {
          name: "Crimson Member",
          photo: DEFAULT_HOST_PHOTO,
          username: null,
        };
  });

  return mapMeetDetailRow({
    ...typedRow,
    host: profileMap.get(typedRow.host_id) || null,
    coHost: typedRow.co_host_id ? profileMap.get(typedRow.co_host_id) || null : null,
    attendeeRiders,
  });
}
