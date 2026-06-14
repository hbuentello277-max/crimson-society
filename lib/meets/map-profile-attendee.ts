import type { MeetAttendee } from "@/lib/meets/types";
import { formatRiderIdentity } from "@/lib/rider-identity";

const DEFAULT_PHOTO = "/icon.png";

type ProfileLike = {
  id?: string;
  username?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  profile_image_url?: string | null;
  avatar_url?: string | null;
};

export function profileToMeetAttendee(profile: ProfileLike | null | undefined): MeetAttendee {
  return {
    name: formatRiderIdentity(profile, { fallback: "Crimson Member" }),
    photo: profile?.profile_image_url || profile?.avatar_url || DEFAULT_PHOTO,
    username: profile?.username ?? null,
  };
}
