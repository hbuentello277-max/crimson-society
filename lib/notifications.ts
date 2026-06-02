export type NotificationType =
  | "meet_joined"
  | "meet_left"
  | "meet_chat_message"
  | "meet_chat_photo"
  | "profile_followed"
  | "meet_removed"
  | "meet_canceled"
  | "meet_ended"
  | "direct_message";

export type NotificationActor = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
};

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  ride_id: string | null;
  conversation_id?: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function actorDisplayName(actor: NotificationActor | null | undefined) {
  return (
    actor?.display_name?.trim() ||
    actor?.full_name?.trim() ||
    actor?.username?.trim()?.replace(/^@+/, "") ||
    "Crimson Member"
  );
}

export function actorPhotoUrl(actor: NotificationActor | null | undefined) {
  return actor?.profile_image_url || actor?.avatar_url || null;
}

export function actorProfileHref(actor: NotificationActor | null | undefined) {
  const username = actor?.username?.trim().replace(/^@+/, "");
  return username ? `/profile/${username}` : null;
}

export function notificationDestination(
  notification: Pick<NotificationItem, "type" | "ride_id" | "conversation_id">,
  actor: NotificationActor | null | undefined
) {
  if (notification.type === "profile_followed") {
    return actorProfileHref(actor) || "/inbox?tab=notifications";
  }

  if (notification.type === "direct_message" && notification.conversation_id) {
    return `/inbox?conversation=${notification.conversation_id}`;
  }

  if (notification.ride_id) {
    return `/rides?meet=${notification.ride_id}`;
  }

  return "/inbox?tab=notifications";
}

export function notificationTypeLabel(type: NotificationType) {
  switch (type) {
    case "meet_joined":
      return "Meet joined";
    case "meet_left":
      return "Meet left";
    case "meet_removed":
      return "Removed";
    case "meet_canceled":
      return "Canceled";
    case "meet_ended":
      return "Ride ended";
    case "meet_chat_photo":
      return "Meet photo";
    case "profile_followed":
      return "New follower";
    case "direct_message":
      return "Message";
    case "meet_chat_message":
    default:
      return "Meet chat";
  }
}

export function notificationSummary(
  notification: Pick<NotificationItem, "type" | "title" | "body">,
  actor: NotificationActor | null | undefined
) {
  const name = actorDisplayName(actor);
  const trimmedBody = notification.body?.trim();

  switch (notification.type) {
    case "profile_followed":
      return `${name} started following you`;
    case "meet_joined":
      return `${name} joined your meet`;
    case "meet_left":
      return `${name} left your meet`;
    case "meet_chat_message":
      return trimmedBody || `${name} sent a message in your meet`;
    case "meet_chat_photo":
      return trimmedBody || `${name} shared a photo in your meet`;
    case "meet_removed":
      return trimmedBody || "You were removed from a meet";
    case "meet_canceled":
      return trimmedBody || "Your meet was canceled";
    case "meet_ended":
      return trimmedBody || "Ride tracking has ended";
    case "direct_message":
      return trimmedBody || `${name} sent you a message`;
    default:
      return trimmedBody || notification.title;
  }
}

export function formatRelativeNotificationTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function isKnownNotificationType(value: string): value is NotificationType {
  return (
    value === "meet_joined" ||
    value === "meet_left" ||
    value === "meet_chat_message" ||
    value === "meet_chat_photo" ||
    value === "profile_followed" ||
    value === "meet_removed" ||
    value === "meet_canceled" ||
    value === "meet_ended" ||
    value === "direct_message"
  );
}
