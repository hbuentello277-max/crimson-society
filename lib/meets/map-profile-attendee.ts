import type { MeetAttendee } from "@/lib/meets/types";

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
  const name =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    "Crimson Member";

  return {
    name,
    photo: profile?.profile_image_url || profile?.avatar_url || DEFAULT_PHOTO,
    username: profile?.username ?? null,
  };
}
