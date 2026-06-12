import type { NotificationItem } from "@/lib/notifications";

/** Mirrors DB producers in grouped_notifications.sql and order-notifications.ts */
export const NOTIFICATION_GROUP_KEY_PATTERNS = {
  directMessage: "dm:{conversationId}:{recipientUserId}",
  connectRequest: "connect_request:{requesterId}:{receiverId}",
  meetJoined: "meet_joined:{meetId}:{hostUserId}",
  meetLeft: "meet_left:{meetId}:{hostUserId}",
  meetChat: "meet_chat:{meetId}:{recipientId}",
  meetUpdated: "meet_updated:{meetId}:{recipientId}",
  meetReminder: "meet_reminder:{meetId}:{recipientId}",
  meetCanceled: "meet_canceled:{meetId}:{recipientId}",
  follow: "follow:{followerId}:{followingId}",
  shopOrder: "order:{orderId}:{userId}",
  postLike: "post_like:{postId}:{ownerId}:{likerId}",
  postComment: "post_comment:{postId}:{ownerId}",
  adminReportQueue: "admin_report_queue:{adminId}",
  adminLowInventory: "admin_low_inventory:{productId}:{adminId}",
  riderSos: "rider_sos:{eventType}:{alertId}:{recipientUserId}",
} as const;

export function directMessageGroupKey(conversationId: string, recipientUserId: string) {
  return `dm:${conversationId}:${recipientUserId}`;
}

export function meetJoinedGroupKey(meetId: string, hostUserId: string) {
  return `meet_joined:${meetId}:${hostUserId}`;
}

export function meetLeftGroupKey(meetId: string, hostUserId: string) {
  return `meet_left:${meetId}:${hostUserId}`;
}

export function meetChatGroupKey(meetId: string, recipientUserId: string) {
  return `meet_chat:${meetId}:${recipientUserId}`;
}

export function meetCanceledGroupKey(meetId: string, recipientUserId: string) {
  return `meet_canceled:${meetId}:${recipientUserId}`;
}

export function followGroupKey(followerId: string, followingId: string) {
  return `follow:${followerId}:${followingId}`;
}

/** @deprecated Use followGroupKey — kept for legacy tests */
export function profileFollowedGroupKey(recipientUserId: string) {
  return `profile_followed:${recipientUserId}`;
}

export function shopOrderGroupKey(orderId: string, userId: string) {
  return `order:${orderId}:${userId}`;
}

export function connectRequestGroupKey(requesterId: string, receiverId: string) {
  return `connect_request:${requesterId}:${receiverId}`;
}

export function meetUpdatedGroupKey(meetId: string, recipientId: string) {
  return `meet_updated:${meetId}:${recipientId}`;
}

export function meetReminderGroupKey(meetId: string, recipientId: string) {
  return `meet_reminder:${meetId}:${recipientId}`;
}

export function postLikedGroupKey(postId: string, ownerId: string, likerId?: string) {
  if (likerId) {
    return `post_like:${postId}:${ownerId}:${likerId}`;
  }
  return `post_liked:${postId}:${ownerId}`;
}

export function postCommentedGroupKey(postId: string, ownerId: string) {
  return `post_comment:${postId}:${ownerId}`;
}

export function adminReportQueueGroupKey(adminId: string) {
  return `admin_report_queue:${adminId}`;
}

export function adminLowInventoryGroupKey(productId: string, adminId: string) {
  return `admin_low_inventory:${productId}:${adminId}`;
}

export function riderSosGroupKey(
  eventType: "sos_activated" | "sos_responded" | "sos_arrived",
  alertId: string,
  recipientUserId: string,
) {
  return `rider_sos:${eventType}:${alertId}:${recipientUserId}`;
}

type CollapseInput = Pick<
  NotificationItem,
  "id" | "type" | "notification_group_key" | "conversation_id" | "ride_id" | "post_id"
>;

/**
 * FCM / Web Push collapse key. Prefer the unread group key so repeated events
 * update one device notification instead of stacking duplicates.
 */
export function pushCollapseKey(
  notification: CollapseInput & { user_id?: string | null },
): string {
  const stored = notification.notification_group_key?.trim();
  if (stored) {
    return stored;
  }

  if (notification.type === "direct_message" && notification.conversation_id) {
    return directMessageGroupKey(
      notification.conversation_id,
      notification.user_id || "recipient",
    );
  }

  if (
    (notification.type === "meet_chat_message" || notification.type === "meet_chat_photo") &&
    notification.ride_id
  ) {
    return meetChatGroupKey(notification.ride_id, notification.user_id || "recipient");
  }

  if (notification.type === "meet_joined" && notification.ride_id) {
    return `meet_joined:${notification.ride_id}`;
  }

  if (notification.type === "meet_left" && notification.ride_id) {
    return meetLeftGroupKey(notification.ride_id, notification.user_id || "host");
  }

  const orderTypes = new Set([
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
    "admin_order_created",
    "admin_order_paid",
    "shop_order_paid",
  ]);

  if (orderTypes.has(notification.type) && notification.id) {
    return `order-fallback:${notification.id}`;
  }

  return notification.id;
}

export function groupedNotificationCount(notification: Pick<NotificationItem, "notification_count">) {
  return Math.max(1, Number(notification.notification_count ?? 1));
}
