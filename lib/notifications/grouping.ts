import type { NotificationItem } from "@/lib/notifications";

/** Mirrors DB producers in grouped_notifications.sql and order-notifications.ts */
export const NOTIFICATION_GROUP_KEY_PATTERNS = {
  directMessage: "dm:{conversationId}:{recipientUserId}",
  connectRequest: "connect_request:{requesterId}:{receiverId}",
  meetJoined: "meet_joined:{meetId}:{hostUserId}",
  meetUpdated: "meet_updated:{meetId}:{recipientId}",
  meetReminder: "meet_reminder:{meetId}:{recipientId}",
  profileFollowed: "profile_followed:{recipientUserId}",
  shopOrder: "order:{orderId}:{userId}",
  postLiked: "post_liked:{postId}:{ownerId}",
  postCommented: "post_commented:{postId}:{ownerId}",
  adminReportQueue: "admin_report_queue:{adminId}",
} as const;

export function directMessageGroupKey(conversationId: string, recipientUserId: string) {
  return `dm:${conversationId}:${recipientUserId}`;
}

export function meetJoinedGroupKey(meetId: string, hostUserId: string) {
  return `meet_joined:${meetId}:${hostUserId}`;
}

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

export function postLikedGroupKey(postId: string, ownerId: string) {
  return `post_liked:${postId}:${ownerId}`;
}

export function postCommentedGroupKey(postId: string, ownerId: string) {
  return `post_commented:${postId}:${ownerId}`;
}

export function adminReportQueueGroupKey(adminId: string) {
  return `admin_report_queue:${adminId}`;
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

  if (notification.type === "meet_joined" && notification.ride_id) {
    return `meet_joined:${notification.ride_id}`;
  }

  if (
    (notification.type === "shop_order_paid" ||
      notification.type === "shop_order_confirmed" ||
      notification.type === "shop_order_ready_for_pickup" ||
      notification.type === "shop_order_shipped") &&
    notification.id
  ) {
    return `order-fallback:${notification.id}`;
  }

  return notification.id;
}

export function groupedNotificationCount(notification: Pick<NotificationItem, "notification_count">) {
  return Math.max(1, Number(notification.notification_count ?? 1));
}
