import { supabase } from "@/lib/supabase";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import { hasMeetCoHost, isValidCoHostCandidate, type MeetHostContext } from "@/lib/meets/permissions";

export type MemberProfileOption = {
  id: string;
  name: string;
  username: string | null;
  photo: string;
};

const DEFAULT_PHOTO = "/icon.png";

function profileDisplayName(profile: {
  display_name?: string | null;
  full_name?: string | null;
  username?: string | null;
}) {
  return (
    profile.display_name?.trim() ||
    profile.full_name?.trim() ||
    profile.username?.trim() ||
    "Crimson Member"
  );
}

export function mapMemberProfileOption(profile: {
  id: string;
  username?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  profile_image_url?: string | null;
  avatar_url?: string | null;
}): MemberProfileOption {
  return {
    id: profile.id,
    name: profileDisplayName(profile),
    username: profile.username ?? null,
    photo: profile.profile_image_url || profile.avatar_url || DEFAULT_PHOTO,
  };
}

export async function setMeetCoHost(meetId: string, coHostUserId: string | null) {
  const { data, error } = await supabase.rpc("set_meet_co_host", {
    target_ride_id: meetId,
    target_co_host_id: coHostUserId,
  });

  if (error) {
    console.error("Failed to set meet co-host:", error);
    return { ok: false as const, error: error.message || "Could not update co-host." };
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return { ok: false as const, error: result?.error || "Could not update co-host." };
  }

  return { ok: true as const };
}

export async function searchMemberProfiles(
  query: string,
  options: {
    excludeUserIds?: string[];
    limit?: number;
  } = {},
) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { ok: true as const, profiles: [] as MemberProfileOption[] };
  }

  const escaped = trimmed.replace(/[%_]/g, "");
  const pattern = `%${escaped}%`;
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, username, display_name, full_name, profile_image_url, avatar_url")
    .or(`username.ilike."${pattern}",display_name.ilike."${pattern}",full_name.ilike."${pattern}"`)
    .limit(options.limit ?? 8);

  if (error) {
    console.error("Failed to search member profiles:", error);
    return { ok: false as const, error: error.message, profiles: [] as MemberProfileOption[] };
  }

  const exclude = new Set(options.excludeUserIds ?? []);
  const profiles = (data || [])
    .filter((profile) => !exclude.has(profile.id))
    .map((profile) => mapMemberProfileOption(profile));

  return { ok: true as const, profiles };
}

export function buildCoHostCandidateList(
  joinedRiders: MemberProfileOption[],
  searchedProfiles: MemberProfileOption[],
  context: MeetHostContext,
) {
  const seen = new Set<string>();
  const candidates: MemberProfileOption[] = [];

  for (const profile of [...joinedRiders, ...searchedProfiles]) {
    if (seen.has(profile.id)) continue;
    if (!isValidCoHostCandidate(context, profile.id)) continue;
    seen.add(profile.id);
    candidates.push(profile);
  }

  return candidates;
}

export function coHostAssignmentBlockedReason(context: MeetHostContext, addingNew: boolean) {
  if (addingNew && hasMeetCoHost(context)) {
    return "This meet already has a co-host. Remove or change the current co-host first.";
  }
  return null;
}
