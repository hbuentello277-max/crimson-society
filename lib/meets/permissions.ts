export type MeetHostContext = {
  hostId?: string | null;
  coHostId?: string | null;
};

export function isPrimaryMeetHost(
  context: MeetHostContext,
  userId: string | null | undefined,
): boolean {
  return Boolean(context.hostId && userId && context.hostId === userId);
}

export function isMeetCoHost(
  context: MeetHostContext,
  userId: string | null | undefined,
): boolean {
  return Boolean(context.coHostId && userId && context.coHostId === userId);
}

export function isMeetHostOrCoHost(
  context: MeetHostContext,
  userId: string | null | undefined,
): boolean {
  return isPrimaryMeetHost(context, userId) || isMeetCoHost(context, userId);
}

export function canModerateMeet(
  context: MeetHostContext,
  userId: string | null | undefined,
  isAdmin = false,
): boolean {
  return isAdmin || isMeetHostOrCoHost(context, userId);
}

export function canManageMeetSettings(
  context: MeetHostContext,
  userId: string | null | undefined,
  isAdmin = false,
): boolean {
  return isAdmin || isPrimaryMeetHost(context, userId);
}

export function canAssignCoHost(
  context: MeetHostContext,
  userId: string | null | undefined,
  isAdmin = false,
): boolean {
  return canManageMeetSettings(context, userId, isAdmin);
}

export function hasMeetCoHost(context: MeetHostContext): boolean {
  return Boolean(context.coHostId);
}

export function canRemoveRiderFromMeet(
  context: MeetHostContext,
  actorUserId: string | null | undefined,
  targetUserId: string,
  isAdmin = false,
): boolean {
  if (!canModerateMeet(context, actorUserId, isAdmin)) {
    return false;
  }

  if (targetUserId === context.hostId) {
    return false;
  }

  if (isMeetCoHost(context, actorUserId) && !isAdmin) {
    return targetUserId !== context.hostId;
  }

  return true;
}

export function isValidCoHostCandidate(
  context: MeetHostContext,
  candidateUserId: string,
): boolean {
  if (!candidateUserId.trim()) return false;
  if (candidateUserId === context.hostId) return false;
  if (context.coHostId && candidateUserId === context.coHostId) return false;
  return true;
}
