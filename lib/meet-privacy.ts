import type { RidePrivacy } from "@/app/rides/page";

export function isInviteOnlyMeet(privacy: RidePrivacy | string | null | undefined) {
  return privacy === "Invite";
}

/** Whether the current user may add themselves as an attendee (not leave). */
export function canSelfJoinMeet(options: {
  privacy: RidePrivacy | string | null | undefined;
  hostId?: string | null;
  userId: string | null | undefined;
  isAdmin: boolean;
}) {
  const { privacy, hostId, userId, isAdmin } = options;

  if (!userId || !hostId || hostId === userId) {
    return false;
  }

  if (isAdmin) {
    return true;
  }

  return !isInviteOnlyMeet(privacy);
}
