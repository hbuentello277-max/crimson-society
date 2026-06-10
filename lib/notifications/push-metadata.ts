import {
  notificationDestination,
  type NotificationActor,
  type NotificationDestinationInput,
  type NotificationMetadata,
  type NotificationType,
} from "@/lib/notifications";
import { pushCollapseKey } from "@/lib/notifications/grouping";

export type NotificationPushMetadata = {
  type: NotificationType | string;
  url: string;
  targetUrl: string;
  actorUserId: string;
  actorUsername: string;
  entityId: string;
  requestId: string;
  postId: string;
  commentId: string;
  orderId: string;
  rideId: string;
  conversationId: string;
  groupKey: string;
};

export function buildNotificationPushMetadata(
  notification: NotificationDestinationInput & {
    type: NotificationType | string;
    actor_id?: string | null;
    post_id?: string | null;
    comment_id?: string | null;
    ride_id?: string | null;
    conversation_id?: string | null;
    notification_group_key?: string | null;
    user_id?: string | null;
    id?: string;
  },
  actor: NotificationActor | null | undefined,
  appOrigin: string,
): NotificationPushMetadata {
  const path = notificationDestination(notification, actor);
  const origin = appOrigin.replace(/\/$/, "");
  const url = `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  const metadata = (notification.metadata ?? {}) as NotificationMetadata & {
    post_id?: string;
    comment_id?: string;
    order_id?: string;
  };

  const requestId = metadata.request_id || metadata.connection_id || "";
  const postId = notification.post_id || metadata.post_id || "";
  const commentId = notification.comment_id || metadata.comment_id || "";
  const orderId = metadata.order_id || metadata.entity_id || "";

  const rideId = notification.ride_id || "";
  const conversationId = notification.conversation_id || "";
  const groupKey = pushCollapseKey({
    id: notification.id || "",
    type: notification.type as NotificationType,
    notification_group_key: notification.notification_group_key,
    conversation_id: notification.conversation_id,
    ride_id: notification.ride_id,
    post_id: notification.post_id,
    user_id: notification.user_id,
  });

  return {
    type: notification.type,
    url,
    targetUrl: url,
    actorUserId: notification.actor_id || metadata.actor_user_id || "",
    actorUsername: metadata.actor_username || actor?.username || "",
    entityId:
      metadata.entity_id ||
      orderId ||
      postId ||
      requestId ||
      commentId ||
      rideId ||
      conversationId ||
      "",
    requestId,
    postId,
    commentId,
    orderId,
    rideId,
    conversationId,
    groupKey,
  };
}
