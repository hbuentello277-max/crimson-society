export type MeetHostContext = {
  hostId?: string | null;
  coHostId?: string | null;
};

export function isPrimaryMeetHost(meet: MeetHostContext, userId: string | null | undefined) {
  return !!userId && !!meet.hostId && meet.hostId === userId;
}

export function isMeetCoHost(meet: MeetHostContext, userId: string | null | undefined) {
  return !!userId && !!meet.coHostId && meet.coHostId === userId;
}

export function isAnyMeetHost(meet: MeetHostContext, userId: string | null | undefined) {
  return isPrimaryMeetHost(meet, userId) || isMeetCoHost(meet, userId);
}

export function canManageMeet(
  meet: MeetHostContext,
  userId: string | null | undefined,
  isAdmin = false,
) {
  return isAdmin || isAnyMeetHost(meet, userId);
}
