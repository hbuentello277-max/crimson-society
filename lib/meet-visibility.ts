export type MeetVisibility = "public" | "followers" | "favorites" | "blackcard" | "invite";

export type MeetPriorityAccess = "off" | "blackcard_first";

export const MEET_VISIBILITY_OPTIONS: {
  value: MeetVisibility;
  label: string;
  description: string;
  blackcardOnly?: boolean;
}[] = [
  { value: "public", label: "Public", description: "Visible to all riders." },
  { value: "followers", label: "Followers", description: "Only riders who follow you." },
  { value: "favorites", label: "Favorites", description: "Riders who favorited you." },
  {
    value: "blackcard",
    label: "Blackcard Members",
    description: "Active Blackcard members only.",
    blackcardOnly: true,
  },
  { value: "invite", label: "Invite Only", description: "Host/admin must add riders." },
];

export function normalizeMeetVisibility(
  value: string | null | undefined,
  legacyPrivacy?: string | null,
): MeetVisibility {
  if (
    value === "public" ||
    value === "followers" ||
    value === "favorites" ||
    value === "blackcard" ||
    value === "invite"
  ) {
    return value;
  }
  return legacyPrivacy === "Invite" ? "invite" : "public";
}

export function meetVisibilityLabel(value: MeetVisibility) {
  return MEET_VISIBILITY_OPTIONS.find((option) => option.value === value)?.label || "Public";
}

export function isInviteOnlyVisibility(value: MeetVisibility | string | null | undefined) {
  return value === "invite";
}

export type MeetAccessContext = {
  viewerId: string | null | undefined;
  hostId: string | null | undefined;
  visibility: MeetVisibility | string | null | undefined;
  legacyPrivacy?: string | null;
  isAdmin?: boolean;
  viewerHasBlackcard?: boolean;
  viewerFollowsHost?: boolean;
  viewerFavoritedHost?: boolean;
  priorityAccess?: MeetPriorityAccess | string | null;
  priorityOpenAt?: string | null;
};

export function canViewMeet(options: MeetAccessContext) {
  const visibility = normalizeMeetVisibility(options.visibility, options.legacyPrivacy);
  const { viewerId, hostId, isAdmin, viewerHasBlackcard } = options;

  if (isAdmin) return true;
  if (!viewerId) return visibility === "public";
  if (hostId && viewerId === hostId) return true;

  switch (visibility) {
    case "public":
      return true;
    case "invite":
      return false;
    case "blackcard":
      return viewerHasBlackcard === true;
    case "followers":
      return options.viewerFollowsHost === true;
    case "favorites":
      return options.viewerFavoritedHost === true;
    default:
      return true;
  }
}

export function canJoinMeet(options: MeetAccessContext & { isGoing?: boolean }) {
  const visibility = normalizeMeetVisibility(options.visibility, options.legacyPrivacy);
  const { viewerId, hostId, isAdmin, viewerHasBlackcard, isGoing } = options;

  if (!viewerId || !hostId || viewerId === hostId) return false;
  if (isAdmin) return true;
  if (isGoing) return true;
  if (!canViewMeet(options)) return false;

  if (visibility === "invite") return false;

  if (options.priorityAccess === "blackcard_first") {
    const openAt = options.priorityOpenAt ? new Date(options.priorityOpenAt).getTime() : null;
    if (openAt && Date.now() < openAt && viewerHasBlackcard !== true) {
      return false;
    }
  }

  return true;
}

export function meetAccessLockMessage(
  options: Pick<MeetAccessContext, "visibility" | "legacyPrivacy" | "priorityAccess" | "priorityOpenAt">,
) {
  const visibility = normalizeMeetVisibility(options.visibility, options.legacyPrivacy);

  if (visibility === "blackcard") {
    return "This meet is exclusive to Blackcard members.";
  }
  if (visibility === "followers") {
    return "This meet is visible to followers of the host.";
  }
  if (visibility === "favorites") {
    return "This meet is visible to riders who favorited the host.";
  }
  if (options.priorityAccess === "blackcard_first") {
    const openAt = options.priorityOpenAt ? new Date(options.priorityOpenAt) : null;
    if (openAt && Date.now() < openAt.getTime()) {
      return `Priority access for Blackcard members until ${openAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}.`;
    }
  }
  if (visibility === "invite") {
    return "Invite-only meet. Ask the host to add you.";
  }
  return null;
}
