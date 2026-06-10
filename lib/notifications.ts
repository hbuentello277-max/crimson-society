export type NotificationType =
  | "meet_joined"
  | "meet_left"
  | "meet_chat_message"
  | "meet_chat_photo"
  | "profile_followed"
  | "follow"
  | "meet_removed"
  | "meet_canceled"
  | "meet_updated"
  | "meet_ended"
  | "meet_reminder"
  | "direct_message"
  | "connection_request"
  | "connection_request_received"
  | "connection_accepted"
  | "post_liked"
  | "post_like"
  | "post_commented"
  | "post_comment"
  | "admin_report_submitted"
  | "account_deletion_requested"
  | "account_deletion_canceled"
  | "account_deletion_approved"
  | "favorite_rider_meet"
  | "favorite_rider_post"
  | "favorite_rider_ride_started"
  | "host_meet_created"
  | "shop_order_paid"
  | "shop_order_confirmed"
  | "shop_order_ready_for_pickup"
  | "shop_order_shipped"
  | "order_created"
  | "order_confirmed"
  | "order_preparing"
  | "order_ready_to_ship"
  | "order_shipped"
  | "order_ready_for_pickup"
  | "order_delivered"
  | "order_completed"
  | "admin_order_created"
  | "admin_order_paid"
  | "admin_low_inventory"
  | "meet_cancelled";

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
  post_id?: string | null;
  comment_id?: string | null;
  deletion_request_id?: string | null;
  target_url?: string | null;
  destination_url?: string | null;
  metadata?: NotificationMetadata | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
  notification_group_key?: string | null;
  notification_count?: number | null;
  last_actor_id?: string | null;
  last_preview_text?: string | null;
  last_event_at?: string | null;
};

export type NotificationMetadata = {
  connection_id?: string;
  request_id?: string;
  entity_type?: string;
  entity_id?: string;
  actor_user_id?: string;
  actor_username?: string;
  route?: string;
  post_id?: string;
  comment_id?: string;
  order_id?: string;
};

export type NotificationDestinationInput = Pick<
  NotificationItem,
  | "type"
  | "ride_id"
  | "conversation_id"
  | "post_id"
  | "comment_id"
  | "deletion_request_id"
  | "target_url"
  | "destination_url"
  | "metadata"
>;

const CONNECT_REQUEST_TYPES = new Set<NotificationType>([
  "connection_request",
  "connection_request_received",
]);

const FOLLOW_TYPES = new Set<NotificationType>(["follow", "profile_followed"]);
const POST_LIKE_TYPES = new Set<NotificationType>(["post_like", "post_liked"]);
const POST_COMMENT_TYPES = new Set<NotificationType>(["post_comment", "post_commented"]);
const ORDER_DETAIL_TYPES = new Set<NotificationType>([
  "order_created",
  "order_confirmed",
  "order_preparing",
  "order_ready_to_ship",
  "order_shipped",
  "order_ready_for_pickup",
  "order_delivered",
  "order_completed",
  "shop_order_confirmed",
  "shop_order_ready_for_pickup",
  "shop_order_shipped",
]);

const ADMIN_SHOP_ORDER_TYPES = new Set<NotificationType>([
  "admin_order_created",
  "admin_order_paid",
  "shop_order_paid",
]);

const MEET_DETAIL_TYPES = new Set<NotificationType>([
  "meet_joined",
  "meet_left",
  "meet_chat_message",
  "meet_chat_photo",
  "meet_removed",
  "meet_canceled",
  "meet_cancelled",
  "meet_updated",
  "meet_ended",
  "meet_reminder",
  "host_meet_created",
]);

const KNOWN_NOTIFICATION_TYPES: NotificationType[] = [
  "meet_joined",
  "meet_left",
  "meet_chat_message",
  "meet_chat_photo",
  "profile_followed",
  "follow",
  "meet_removed",
  "meet_canceled",
  "meet_updated",
  "meet_ended",
  "meet_reminder",
  "direct_message",
  "connection_request",
  "connection_request_received",
  "connection_accepted",
  "post_liked",
  "post_like",
  "post_commented",
  "post_comment",
  "admin_report_submitted",
  "account_deletion_requested",
  "account_deletion_canceled",
  "account_deletion_approved",
  "favorite_rider_meet",
  "favorite_rider_post",
  "favorite_rider_ride_started",
  "host_meet_created",
  "shop_order_paid",
  "shop_order_confirmed",
  "shop_order_ready_for_pickup",
  "shop_order_shipped",
  "order_created",
  "order_confirmed",
  "order_preparing",
  "order_ready_to_ship",
  "order_shipped",
  "order_ready_for_pickup",
  "order_delivered",
  "order_completed",
  "admin_order_created",
  "admin_order_paid",
  "admin_low_inventory",
  "meet_cancelled",
];

export function isKnownNotificationType(value: string): value is NotificationType {
  return KNOWN_NOTIFICATION_TYPES.includes(value as NotificationType);
}

function normalizeInAppPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

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

export function connectionRequestReviewPath(requestId: string) {
  return `/connect/requests/${requestId}`;
}

export function postNotificationPath(postId: string, commentId?: string | null) {
  const params = new URLSearchParams({ post: postId });
  if (commentId) {
    params.set("comment", commentId);
  }
  return `/dashboard?${params.toString()}`;
}

export function orderNotificationPath(orderId: string) {
  return `/profile/orders/${orderId}`;
}

export function meetNotificationPath(meetId: string, section?: "chat") {
  const base = `/meets/${meetId}`;
  if (section === "chat") {
    return `${base}?section=chat`;
  }
  return base;
}

export function messageThreadPath(conversationId: string) {
  return `/messages/${conversationId}`;
}

export function adminOrderNotificationPath(orderId: string) {
  return `/admin/shop/orders/${orderId}`;
}

export function adminShopPath() {
  return "/admin/shop";
}

export function shouldNotifyPostOwner(ownerId: string | null | undefined, actorId: string) {
  return Boolean(ownerId && ownerId !== actorId);
}

function metadataRoute(
  metadata: NotificationMetadata | null | undefined,
  notificationType?: NotificationType | string,
): string | null {
  if (!metadata) return null;

  const explicitRoute = metadata.route ? normalizeInAppPath(metadata.route) : null;
  if (explicitRoute) return explicitRoute;

  const requestId = metadata.request_id || metadata.connection_id || metadata.entity_id;
  if (requestId && metadata.entity_type === "connection_request") {
    return connectionRequestReviewPath(String(requestId));
  }

  if (requestId && CONNECT_REQUEST_TYPES.has(metadata.entity_type as NotificationType)) {
    return connectionRequestReviewPath(String(requestId));
  }

  const actorUsername = metadata.actor_username?.trim().replace(/^@+/, "");
  if (actorUsername && (metadata.entity_type === "connection_accepted" || metadata.entity_type === "follow")) {
    return `/profile/${actorUsername}`;
  }

  if (metadata.post_id) {
    return postNotificationPath(metadata.post_id, metadata.comment_id);
  }

  if (metadata.order_id) {
    const entityType = metadata.entity_type || "";
    if (
      entityType.startsWith("admin_") ||
      (notificationType && ADMIN_SHOP_ORDER_TYPES.has(notificationType as NotificationType))
    ) {
      return adminOrderNotificationPath(metadata.order_id);
    }
    return orderNotificationPath(metadata.order_id);
  }

  return null;
}

export function notificationDestination(
  notification: NotificationDestinationInput,
  actor: NotificationActor | null | undefined,
) {
  const storedPath =
    (notification.target_url ? normalizeInAppPath(notification.target_url) : null) ||
    (notification.destination_url ? normalizeInAppPath(notification.destination_url) : null);
  if (storedPath) {
    return storedPath;
  }

  const metadataPath = metadataRoute(notification.metadata, notification.type);
  if (metadataPath) {
    return metadataPath;
  }

  if (
    notification.type === "account_deletion_requested" ||
    notification.type === "account_deletion_canceled" ||
    notification.type === "account_deletion_approved"
  ) {
    const params = new URLSearchParams({ section: "deletion" });
    if (notification.deletion_request_id) {
      params.set("request", notification.deletion_request_id);
    }
    return `/admin?${params.toString()}`;
  }

  if (POST_LIKE_TYPES.has(notification.type)) {
    return notification.post_id ? postNotificationPath(notification.post_id) : "/dashboard";
  }

  if (POST_COMMENT_TYPES.has(notification.type)) {
    return notification.post_id
      ? postNotificationPath(notification.post_id, notification.comment_id)
      : "/dashboard";
  }


  if (notification.type === "direct_message" && notification.conversation_id) {
    return messageThreadPath(notification.conversation_id);
  }

  if (notification.type === "direct_message") {
    return "/messages";
  }

  if (ADMIN_SHOP_ORDER_TYPES.has(notification.type)) {
    const orderId = notification.metadata?.order_id || notification.metadata?.entity_id;
    return orderId ? adminOrderNotificationPath(String(orderId)) : adminShopPath();
  }

  if (notification.type === "admin_low_inventory") {
    return adminShopPath();
  }

  if (MEET_DETAIL_TYPES.has(notification.type) && notification.ride_id) {
    const isChat =
      notification.type === "meet_chat_message" || notification.type === "meet_chat_photo";
    return meetNotificationPath(notification.ride_id, isChat ? "chat" : undefined);
  }

  if (notification.type === "host_meet_created" && notification.ride_id) {
    return meetNotificationPath(notification.ride_id);
  }

  if (FOLLOW_TYPES.has(notification.type)) {
    return actorProfileHref(actor) || "/connect";
  }

  if (CONNECT_REQUEST_TYPES.has(notification.type)) {
    const requestId =
      notification.metadata?.request_id ||
      notification.metadata?.connection_id ||
      notification.metadata?.entity_id;
    return requestId ? connectionRequestReviewPath(String(requestId)) : "/connect";
  }

  if (notification.type === "connection_accepted") {
    return actorProfileHref(actor) || "/connect";
  }

  if (notification.type === "admin_report_submitted") {
    return storedPath ?? "/admin?section=moderation";
  }

  if (ORDER_DETAIL_TYPES.has(notification.type)) {
    const orderId = notification.metadata?.order_id || notification.metadata?.entity_id;
    return orderId ? orderNotificationPath(String(orderId)) : "/profile/orders";
  }

  if (MEET_DETAIL_TYPES.has(notification.type)) {
    return "/meets";
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
    case "meet_updated":
      return "Meet updated";
    case "meet_ended":
      return "Ride ended";
    case "meet_reminder":
      return "Meet reminder";
    case "meet_chat_photo":
      return "Meet photo";
    case "profile_followed":
    case "follow":
      return "New follower";
    case "direct_message":
      return "Message";
    case "connection_request":
    case "connection_request_received":
      return "Connection request";
    case "connection_accepted":
      return "Connection accepted";
    case "admin_report_submitted":
      return "Moderation report";
    case "post_liked":
    case "post_like":
      return "Post liked";
    case "post_commented":
    case "post_comment":
      return "Post comment";
    case "account_deletion_requested":
      return "Deletion request";
    case "account_deletion_canceled":
      return "Deletion canceled";
    case "account_deletion_approved":
      return "Deletion approved";
    case "favorite_rider_meet":
      return "Favorite meet";
    case "favorite_rider_post":
      return "Favorite post";
    case "favorite_rider_ride_started":
      return "Ride started";
    case "host_meet_created":
      return "Host meet";
    case "shop_order_paid":
    case "admin_order_paid":
      return "Shop order";
    case "admin_order_created":
      return "New order";
    case "admin_low_inventory":
      return "Low inventory";
    case "shop_order_confirmed":
    case "order_confirmed":
      return "Order confirmed";
    case "order_created":
      return "Order received";
    case "shop_order_ready_for_pickup":
    case "order_ready_for_pickup":
      return "Ready for pickup";
    case "shop_order_shipped":
    case "order_shipped":
      return "Shipped";
    case "order_preparing":
      return "Order preparing";
    case "order_ready_to_ship":
      return "Ready to ship";
    case "order_delivered":
      return "Delivered";
    case "order_completed":
      return "Order completed";
    case "meet_cancelled":
      return "Meet canceled";
    case "meet_chat_message":
    default:
      return "Meet chat";
  }
}

export function notificationSummary(
  notification: Pick<NotificationItem, "type" | "title" | "body">,
  actor: NotificationActor | null | undefined,
) {
  const name = actorDisplayName(actor);
  const trimmedBody = notification.body?.trim();

  switch (notification.type) {
    case "profile_followed":
    case "follow":
      return trimmedBody || `${name} followed you`;
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
    case "meet_updated":
      return trimmedBody || `${name} updated your meet`;
    case "meet_ended":
      return trimmedBody || "Ride tracking has ended";
    case "meet_reminder":
      return trimmedBody || notification.title;
    case "direct_message":
      return trimmedBody || `${name} sent you a message`;
    case "post_liked":
    case "post_like":
      return trimmedBody || `${name} liked your post`;
    case "post_commented":
    case "post_comment":
      return trimmedBody || `${name} commented on your post`;
    case "connection_request":
    case "connection_request_received":
      return trimmedBody || `${name} sent you a connection request`;
    case "connection_accepted":
      return trimmedBody || `${name} approved your connection request`;
    case "admin_report_submitted":
      return trimmedBody || "A member submitted a moderation report";
    case "account_deletion_requested":
      return trimmedBody || "A member submitted an account deletion request";
    case "account_deletion_canceled":
      return trimmedBody || "A member canceled their account deletion request";
    case "account_deletion_approved":
      return trimmedBody || "An account deletion request was approved";
    case "favorite_rider_meet":
      return trimmedBody || `${name} created a new meet`;
    case "favorite_rider_post":
      return trimmedBody || `${name} shared a new post`;
    case "favorite_rider_ride_started":
      return trimmedBody || `${name} started ride tracking`;
    case "host_meet_created":
      return trimmedBody || `${name} created a new meet`;
    case "shop_order_paid":
    case "admin_order_created":
    case "admin_order_paid":
    case "admin_low_inventory":
    case "shop_order_confirmed":
    case "order_created":
    case "order_confirmed":
    case "shop_order_ready_for_pickup":
    case "order_ready_for_pickup":
    case "shop_order_shipped":
    case "order_preparing":
    case "order_ready_to_ship":
    case "order_shipped":
    case "order_delivered":
    case "order_completed":
    case "meet_canceled":
    case "meet_cancelled":
      return trimmedBody || notification.title;
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
