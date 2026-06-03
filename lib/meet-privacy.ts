import type { RidePrivacy } from "@/app/rides/page";

export function isInviteOnlyMeet(
  privacy: RidePrivacy | string | null | undefined,
) {
  return privacy === "Invite";
}

export function isBlackcardMeet(
  privacy: RidePrivacy | string | null | undefined,
) {
  return privacy === "Blackcard";
}

/** Whether the current user may add themselves as an attendee (not leave). */
export function canSelfJoinMeet(options: {
  privacy: RidePrivacy | string | null | undefined;
  hostId?: string | null;
  userId: string | null | undefined;
  isAdmin: boolean;
  hasBlackcardAccess?: boolean;
}) {
  const { privacy, hostId, userId, isAdmin, hasBlackcardAccess = false } =
    options;

  if (!userId || !hostId || hostId === userId) {
    return false;
  }

  if (isAdmin) {
    return true;
  }

  if (isInviteOnlyMeet(privacy)) {
    return false;
  }

  if (isBlackcardMeet(privacy)) {
    return hasBlackcardAccess;
  }

  return true;
}

export function getMeetJoinBlockMessage(
  privacy: RidePrivacy | string | null | undefined,
) {
  if (isBlackcardMeet(privacy)) {
    return "Blackcard members only. Subscribe to join this meet.";
  }

  if (isInviteOnlyMeet(privacy)) {
    return "Invite-only meet. Ask the host for access.";
  }

  return "You cannot join this meet.";
}
