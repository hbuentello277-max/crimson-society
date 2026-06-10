import type { NotificationItem } from "@/lib/notifications";
import { groupedNotificationCount } from "@/lib/notifications/grouping";

export type FeedNotificationRow = NotificationItem & {
  user_id?: string;
};

export type FeedNotificationItem = FeedNotificationRow & {
  /** Collapsed DM message count for display (defaults to groupedNotificationCount). */
  feedMessageCount: number;
  /** Preview line for grouped DMs (`last_preview_text` or merged legacy body). */
  feedPreviewText: string | null;
  /** Sorting + date-section timestamp (`last_event_at ?? created_at`). */
  feedTimestamp: string;
  /** True when this row represents a collapsed direct-message conversation. */
  isGroupedDirectMessage: boolean;
};

export type FeedDateSection = {
  label: "Today" | "Yesterday" | "Earlier";
  items: FeedNotificationItem[];
};

const DIRECT_MESSAGE_TYPE = "direct_message" as const;

const CONNECTION_REQUEST_TYPES = new Set<string>([
  "connection_request",
  "connection_request_received",
]);

function isDirectMessageNotification(
  notification: Pick<NotificationItem, "type">,
): boolean {
  return notification.type === DIRECT_MESSAGE_TYPE;
}

function feedTimestampFor(notification: Pick<NotificationItem, "last_event_at" | "created_at">) {
  return notification.last_event_at ?? notification.created_at;
}

function timestampMs(value: string) {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Group key for collapsing DM notifications in the feed.
 * Prefer stored `notification_group_key`; otherwise conversation + actor + type.
 */
export function directMessageFeedGroupKey(
  notification: Pick<
    NotificationItem,
    | "type"
    | "notification_group_key"
    | "conversation_id"
    | "actor_id"
    | "last_actor_id"
  >,
): string | null {
  if (!isDirectMessageNotification(notification)) {
    return null;
  }

  const stored = notification.notification_group_key?.trim();
  if (stored) {
    return stored;
  }

  const conversationId = notification.conversation_id?.trim();
  if (!conversationId) {
    return null;
  }

  const actorId = notification.last_actor_id ?? notification.actor_id;
  if (!actorId) {
    return null;
  }

  return `${conversationId}:${actorId}:${DIRECT_MESSAGE_TYPE}`;
}

function mergeDirectMessageGroup(rows: FeedNotificationRow[]): FeedNotificationItem {
  const sorted = [...rows].sort(
    (left, right) => timestampMs(feedTimestampFor(right)) - timestampMs(feedTimestampFor(left)),
  );
  const latest = sorted[0];
  const messageCount = sorted.reduce(
    (total, row) => total + groupedNotificationCount(row),
    0,
  );
  const preview =
    latest.last_preview_text?.trim() ||
    latest.body?.trim() ||
    sorted.find((row) => row.body?.trim())?.body?.trim() ||
    null;

  return {
    ...latest,
    feedMessageCount: messageCount,
    feedPreviewText: preview,
    feedTimestamp: feedTimestampFor(latest),
    isGroupedDirectMessage: true,
  };
}

function toDirectMessageFeedItem(notification: FeedNotificationRow): FeedNotificationItem {
  return {
    ...notification,
    feedMessageCount: groupedNotificationCount(notification),
    feedPreviewText: notification.last_preview_text?.trim() || notification.body?.trim() || null,
    feedTimestamp: feedTimestampFor(notification),
    isGroupedDirectMessage: true,
  };
}

function toSingleFeedItem(notification: FeedNotificationRow): FeedNotificationItem {
  return {
    ...notification,
    feedMessageCount: groupedNotificationCount(notification),
    feedPreviewText: notification.last_preview_text?.trim() || notification.body?.trim() || null,
    feedTimestamp: feedTimestampFor(notification),
    isGroupedDirectMessage: false,
  };
}

/**
 * Collapse direct-message notifications into one feed card per conversation group.
 * Connection requests and other notification types are left as individual rows.
 */
export function collapseNotificationsForFeed(
  notifications: FeedNotificationRow[],
): FeedNotificationItem[] {
  const directMessages: FeedNotificationRow[] = [];
  const otherNotifications: FeedNotificationRow[] = [];

  for (const notification of notifications) {
    if (isDirectMessageNotification(notification)) {
      directMessages.push(notification);
    } else {
      otherNotifications.push(notification);
    }
  }

  const groupedConversationIds = new Set(
    directMessages
      .filter((notification) => notification.notification_group_key?.trim())
      .map((notification) => notification.conversation_id)
      .filter((conversationId): conversationId is string => Boolean(conversationId?.trim())),
  );

  const eligibleDirectMessages = directMessages.filter((notification) => {
    const conversationId = notification.conversation_id?.trim();
    const hasGroupKey = Boolean(notification.notification_group_key?.trim());

    if (!conversationId) {
      return true;
    }

    if (hasGroupKey) {
      return true;
    }

    return !groupedConversationIds.has(conversationId);
  });

  const directMessageGroups = new Map<string, FeedNotificationRow[]>();

  for (const notification of eligibleDirectMessages) {
    const groupKey =
      directMessageFeedGroupKey(notification) ||
      `dm-fallback:${notification.id}`;

    const bucket = directMessageGroups.get(groupKey);
    if (bucket) {
      bucket.push(notification);
    } else {
      directMessageGroups.set(groupKey, [notification]);
    }
  }

  const collapsedDirectMessages = Array.from(directMessageGroups.values()).map((rows) =>
    rows.length > 1 ? mergeDirectMessageGroup(rows) : toDirectMessageFeedItem(rows[0]),
  );

  const feedItems = [
    ...otherNotifications.map(toSingleFeedItem),
    ...collapsedDirectMessages,
  ];

  return feedItems.sort(
    (left, right) => timestampMs(right.feedTimestamp) - timestampMs(left.feedTimestamp),
  );
}

export function feedDateLabel(timestamp: string): FeedDateSection["label"] {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

export function groupFeedItemsByDate(items: FeedNotificationItem[]): FeedDateSection[] {
  const groups: FeedDateSection[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];

  const groupsByLabel = new Map(groups.map((group) => [group.label, group]));

  for (const item of items) {
    groupsByLabel.get(feedDateLabel(item.feedTimestamp))?.items.push(item);
  }

  return groups.filter((group) => group.items.length > 0);
}

export function groupedDirectMessageSummary(
  actorName: string,
  messageCount: number,
): string {
  const label = messageCount === 1 ? "message" : "messages";
  return `${actorName} sent ${messageCount} ${label}`;
}

export function groupedDirectMessagePreview(previewText: string | null | undefined): string | null {
  const trimmed = previewText?.trim();
  if (!trimmed) return null;
  return `Latest message: "${trimmed}"`;
}

/** Actor id used for grouped DM cards (`last_actor_id ?? actor_id`). */
export function feedActorIdForItem(item: FeedNotificationItem): string | null {
  if (item.isGroupedDirectMessage) {
    return item.last_actor_id ?? item.actor_id;
  }
  return item.actor_id;
}

/**
 * Unread badge total for nav badges — counts raw notification rows, not collapsed feed cards.
 */
export function unreadNotificationBadgeTotal(
  notifications: Pick<NotificationItem, "read_at">[],
): number {
  return notifications.filter((notification) => !notification.read_at).length;
}

export function isConnectionRequestNotification(
  notification: Pick<NotificationItem, "type">,
): boolean {
  return CONNECTION_REQUEST_TYPES.has(notification.type);
}
