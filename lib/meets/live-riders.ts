import type { LiveRideRider } from "@/components/MeetMap";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
};

type LiveLocationRow = {
  ride_id: string;
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
};

function riderName(profile: ProfileRow | null | undefined) {
  return (
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    "Crimson Member"
  );
}

function riderPhoto(profile: ProfileRow | null | undefined) {
  return profile?.profile_image_url || profile?.avatar_url || null;
}

function profileHref(username?: string | null) {
  const clean = username?.trim().replace(/^@+/, "");
  return clean ? `/profile/${clean}` : null;
}

/** Loads riders sharing live location for a meet (last 30 minutes). */
export async function loadMeetLiveRiders(
  meetId: string,
  options: { excludeUserId?: string | null } = {},
): Promise<LiveRideRider[]> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(MEET_TABLES.liveLocations)
    .select("ride_id, user_id, lat, lng, updated_at")
    .eq("ride_id", meetId)
    .eq("sharing_enabled", true)
    .gte("updated_at", cutoff)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to load meet live riders:", error);
    return [];
  }

  const rows = ((data || []) as LiveLocationRow[]).filter(
    (row) => !options.excludeUserId || row.user_id !== options.excludeUserId,
  );

  const profileIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, full_name, profile_image_url, avatar_url")
        .in("id", profileIds)
    : { data: [], error: null };

  if (profilesError) {
    console.error("Failed to load meet live rider profiles:", profilesError);
  }

  const profileMap = new Map(
    ((profiles || []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );

  return rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    const displayName = riderName(profile);

    return {
      user_id: row.user_id,
      rider_name: displayName,
      rider_username: profile?.username || null,
      rider_display_name: displayName,
      rider_photo: riderPhoto(profile),
      lat: row.lat,
      lng: row.lng,
      last_updated_at: row.updated_at,
      last_updated_label: "Live on route",
      profile_href: profileHref(profile?.username),
    };
  });
}
