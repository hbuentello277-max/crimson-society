import type { NotificationActor, NotificationItem, NotificationType } from "@/lib/notifications";
import { feedActorIdForItem, type FeedNotificationItem } from "@/lib/notifications/feed-grouping";

/** Notification types that always use the branded Crimson orb (no person actor). */
const BRANDED_ORB_TYPES = new Set<NotificationType>([
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
  "admin_report_submitted",
  "account_deletion_requested",
  "account_deletion_canceled",
  "account_deletion_approved",
  "crimson_credits_reward",
]);

export type NotificationLeadingVisualKind = "actor-avatar" | "crimson-orb";

export function notificationUsesBrandedOrb(type: NotificationType): boolean {
  return BRANDED_ORB_TYPES.has(type);
}

/** Resolve the person actor id for avatar display. */
export function notificationActorId(
  notification: Pick<
    NotificationItem,
    "type" | "actor_id" | "last_actor_id" | "metadata"
  >,
): string | null {
  if (notificationUsesBrandedOrb(notification.type)) {
    return null;
  }

  const metadataActorId = notification.metadata?.actor_user_id?.trim();
  if (metadataActorId) {
    return metadataActorId;
  }

  return notification.last_actor_id ?? notification.actor_id;
}

export function notificationActorIdForFeedItem(item: FeedNotificationItem): string | null {
  if (notificationUsesBrandedOrb(item.type)) {
    return null;
  }

  const fromFeed = feedActorIdForItem(item);
  if (fromFeed) {
    return fromFeed;
  }

  return notificationActorId(item);
}

export function resolveNotificationLeadingVisual(
  notification: FeedNotificationItem,
  actorsById: Record<string, NotificationActor>,
): {
  kind: NotificationLeadingVisualKind;
  actor: NotificationActor | null;
} {
  const actorId = notificationActorIdForFeedItem(notification);
  if (!actorId) {
    return { kind: "crimson-orb", actor: null };
  }

  return {
    kind: "actor-avatar",
    actor: actorsById[actorId] ?? null,
  };
}

export function collectNotificationActorIds(
  notifications: Array<
    Pick<NotificationItem, "type" | "actor_id" | "last_actor_id" | "metadata">
  >,
): string[] {
  const ids = new Set<string>();

  for (const notification of notifications) {
    if (notificationUsesBrandedOrb(notification.type)) {
      continue;
    }

    const actorId = notificationActorId(notification);
    if (actorId) {
      ids.add(actorId);
    }
  }

  return Array.from(ids);
}
