import {
  notificationDestination,
  type NotificationActor,
  type NotificationDestinationInput,
  type NotificationMetadata,
  type NotificationType,
} from "@/lib/notifications";

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
};

export function buildNotificationPushMetadata(
  notification: NotificationDestinationInput & {
    type: NotificationType | string;
    actor_id?: string | null;
    post_id?: string | null;
    comment_id?: string | null;
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
      "",
    requestId,
    postId,
    commentId,
    orderId,
  };
}
