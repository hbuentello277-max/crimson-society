import type { RidePrivacy } from "@/app/rides/page";
import {
  canJoinMeet as canJoinMeetVisibility,
  canViewMeet,
  meetAccessLockMessage,
  normalizeMeetVisibility,
  type MeetAccessContext,
} from "@/lib/meet-visibility";

export function isInviteOnlyMeet(
  privacy: RidePrivacy | string | null | undefined,
  visibility?: string | null,
) {
  return normalizeMeetVisibility(visibility, privacy) === "invite";
}

export function isBlackcardMeet(
  privacy: RidePrivacy | string | null | undefined,
  visibility?: string | null,
) {
  return (
    normalizeMeetVisibility(visibility, privacy) === "blackcard" || privacy === "Blackcard"
  );
}

/** Whether the current user may add themselves as an attendee (not leave). */
export function canSelfJoinMeet(options: {
  privacy: RidePrivacy | string | null | undefined;
  visibility?: string | null;
  hostId?: string | null;
  userId: string | null | undefined;
  isAdmin: boolean;
  hasBlackcardAccess?: boolean;
  viewerFollowsHost?: boolean;
  viewerFavoritedHost?: boolean;
  isGoing?: boolean;
}) {
  const context: MeetAccessContext & { isGoing?: boolean } = {
    viewerId: options.userId,
    hostId: options.hostId,
    visibility: options.visibility,
    legacyPrivacy: options.privacy,
    isAdmin: options.isAdmin,
    viewerHasBlackcard: options.hasBlackcardAccess,
    viewerFollowsHost: options.viewerFollowsHost,
    viewerFavoritedHost: options.viewerFavoritedHost,
    isGoing: options.isGoing,
  };

  return canJoinMeetVisibility(context);
}

export function getMeetJoinBlockMessage(options: {
  privacy: RidePrivacy | string | null | undefined;
  visibility?: string | null;
  hasBlackcardAccess?: boolean;
  viewerFollowsHost?: boolean;
  viewerFavoritedHost?: boolean;
}) {
  const lockMessage = meetAccessLockMessage({
    visibility: options.visibility,
    legacyPrivacy: options.privacy,
  });

  if (lockMessage) return lockMessage;

  if (isBlackcardMeet(options.privacy, options.visibility)) {
    return "Blackcard members only. Subscribe to join this meet.";
  }

  if (isInviteOnlyMeet(options.privacy, options.visibility)) {
    return "Invite-only meet. Ask the host for access.";
  }

  return "You cannot join this meet.";
}

export function canViewMeetForUser(options: MeetAccessContext) {
  return canViewMeet(options);
}
