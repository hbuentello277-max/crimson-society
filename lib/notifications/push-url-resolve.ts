/**
 * Shared push notification URL resolution (mirrors public/firebase-messaging-sw.js).
 */
export type PushUrlData = {
  targetUrl?: string | null;
  url?: string | null;
  requestId?: string | null;
  orderId?: string | null;
  entityId?: string | null;
  postId?: string | null;
  commentId?: string | null;
  rideId?: string | null;
  conversationId?: string | null;
  actorUsername?: string | null;
  type?: string | null;
};

export function resolvePushNotificationPath(data: PushUrlData): string | null {
  const raw =
    data.targetUrl?.trim() ||
    data.url?.trim() ||
    (data.requestId ? `/connect/requests/${data.requestId}` : null) ||
    (String(data.type || "").startsWith("sos_") && data.entityId
      ? `/rider-sos/alerts/${data.entityId}`
      : null) ||
    (data.orderId ? `/profile/orders/${data.orderId}` : null) ||
    (data.conversationId && data.type === "sos_chat_message"
      ? `/inbox?conversation=${data.conversationId}`
      : null) ||
    (data.conversationId ? `/messages/${data.conversationId}` : null) ||
    (data.rideId
      ? data.type === "meet_chat_message" || data.type === "meet_chat_photo"
        ? `/meets/${data.rideId}?section=chat`
        : `/meets/${data.rideId}`
      : null) ||
    (data.postId
      ? data.commentId
        ? `/dashboard?post=${data.postId}&comment=${data.commentId}`
        : `/dashboard?post=${data.postId}`
      : null) ||
    (data.actorUsername ? `/profile/${data.actorUsername}` : null);

  if (!raw) {
    if (data.type === "direct_message") return "/messages";
    if (data.type === "admin_low_inventory" || String(data.type || "").startsWith("admin_order")) {
      return "/admin/shop";
    }
    if (String(data.type || "").startsWith("meet_")) return "/meets";
    if (String(data.type || "").startsWith("sos_")) return "/rider-sos";
    if (String(data.type || "").startsWith("order_")) return "/profile/orders";
    return null;
  }

  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function resolvePushNotificationUrl(data: PushUrlData, origin: string): string {
  const path = resolvePushNotificationPath(data);
  if (!path) {
    return `${origin.replace(/\/$/, "")}/inbox?tab=notifications`;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = origin.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
