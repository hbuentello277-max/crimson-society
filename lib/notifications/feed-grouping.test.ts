import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapseNotificationsForFeed,
  directMessageFeedGroupKey,
  feedDateLabel,
  groupFeedItemsByDate,
  groupedDirectMessagePreview,
  groupedDirectMessageSummary,
  unreadNotificationBadgeTotal,
} from "@/lib/notifications/feed-grouping";
import type { NotificationItem } from "@/lib/notifications";

function dmRow(
  overrides: Partial<NotificationItem & { user_id: string }> = {},
): NotificationItem & { user_id: string } {
  return {
    id: "n-1",
    user_id: "user-2",
    type: "direct_message",
    title: "Message",
    body: "Hello",
    ride_id: null,
    conversation_id: "conv-1",
    actor_id: "actor-1",
    read_at: null,
    created_at: "2026-06-09T12:00:00.000Z",
    notification_group_key: null,
    notification_count: 1,
    last_actor_id: null,
    last_preview_text: null,
    last_event_at: null,
    ...overrides,
  };
}

function connectionRow(
  overrides: Partial<NotificationItem & { user_id: string }> = {},
): NotificationItem & { user_id: string } {
  return {
    id: "conn-1",
    user_id: "user-2",
    type: "connection_request",
    title: "Connection request",
    body: "jjaymick001 sent you a connection request",
    ride_id: null,
    conversation_id: null,
    actor_id: "actor-9",
    read_at: null,
    created_at: "2026-06-09T13:00:00.000Z",
    ...overrides,
  };
}

describe("directMessageFeedGroupKey", () => {
  it("prefers notification_group_key when present", () => {
    assert.equal(
      directMessageFeedGroupKey({
        type: "direct_message",
        notification_group_key: "dm:conv-1:user-2",
        conversation_id: "conv-1",
        actor_id: "actor-1",
        last_actor_id: null,
      }),
      "dm:conv-1:user-2",
    );
  });

  it("falls back to conversation_id, actor, and type", () => {
    assert.equal(
      directMessageFeedGroupKey({
        type: "direct_message",
        notification_group_key: null,
        conversation_id: "conv-9",
        actor_id: "actor-legacy",
        last_actor_id: "actor-latest",
      }),
      "conv-9:actor-latest:direct_message",
    );
  });
});

describe("collapseNotificationsForFeed", () => {
  it("renders multiple DM notifications from the same conversation as one card", () => {
    const feed = collapseNotificationsForFeed([
      dmRow({
        id: "legacy-1",
        body: "First",
        created_at: "2026-06-09T10:00:00.000Z",
      }),
      dmRow({
        id: "legacy-2",
        body: "Second",
        created_at: "2026-06-09T11:00:00.000Z",
      }),
      dmRow({
        id: "legacy-3",
        body: "Third",
        created_at: "2026-06-09T12:00:00.000Z",
      }),
    ]);

    assert.equal(feed.length, 1);
    assert.equal(feed[0].feedMessageCount, 3);
    assert.equal(feed[0].isGroupedDirectMessage, true);
  });

  it("uses the latest preview on grouped DM cards", () => {
    const feed = collapseNotificationsForFeed([
      dmRow({
        id: "legacy-1",
        body: "Older preview",
        last_preview_text: null,
        created_at: "2026-06-09T10:00:00.000Z",
      }),
      dmRow({
        id: "grouped",
        notification_group_key: "dm:conv-1:user-2",
        notification_count: 6,
        body: "Grouped body",
        last_preview_text: "So does this message stuff actually work?",
        last_event_at: "2026-06-09T14:00:00.000Z",
        created_at: "2026-06-09T09:00:00.000Z",
      }),
    ]);

    assert.equal(feed.length, 1);
    assert.equal(
      feed[0].feedPreviewText,
      "So does this message stuff actually work?",
    );
  });

  it("uses the latest timestamp on grouped DM cards", () => {
    const feed = collapseNotificationsForFeed([
      dmRow({
        id: "older",
        created_at: "2026-06-08T10:00:00.000Z",
        last_event_at: "2026-06-08T10:00:00.000Z",
      }),
      dmRow({
        id: "newer",
        created_at: "2026-06-07T08:00:00.000Z",
        last_event_at: "2026-06-09T16:30:00.000Z",
        last_preview_text: "Latest",
        notification_count: 2,
      }),
    ]);

    assert.equal(feed.length, 1);
    assert.equal(feed[0].feedTimestamp, "2026-06-09T16:30:00.000Z");
    assert.equal(feed[0].id, "newer");
  });

  it("displays notification_count on grouped cards", () => {
    const feed = collapseNotificationsForFeed([
      dmRow({
        notification_group_key: "dm:conv-1:user-2",
        notification_count: 6,
        last_preview_text: "Latest line",
        last_event_at: "2026-06-09T15:00:00.000Z",
      }),
    ]);

    assert.equal(feed[0].feedMessageCount, 6);
    assert.equal(
      groupedDirectMessageSummary("jjaymick001", feed[0].feedMessageCount),
      "jjaymick001 sent 6 messages",
    );
    assert.equal(
      groupedDirectMessagePreview(feed[0].feedPreviewText),
      'Latest message: "Latest line"',
    );
  });

  it("keeps connection requests separate from message notifications", () => {
    const feed = collapseNotificationsForFeed([
      connectionRow(),
      dmRow({
        notification_group_key: "dm:conv-1:user-2",
        notification_count: 4,
        last_preview_text: "Hey",
      }),
      dmRow({
        id: "legacy-dup",
        conversation_id: "conv-1",
        body: "Should be hidden",
      }),
    ]);

    assert.equal(feed.length, 2);
    assert.equal(feed[0].type, "connection_request");
    assert.equal(feed[1].type, "direct_message");
    assert.equal(feed[1].feedMessageCount, 4);
  });

  it("hides legacy DM rows when a grouped summary exists for the conversation", () => {
    const feed = collapseNotificationsForFeed([
      dmRow({
        id: "grouped",
        notification_group_key: "dm:conv-1:user-2",
        notification_count: 5,
        last_preview_text: "Grouped preview",
      }),
      dmRow({
        id: "legacy-1",
        notification_group_key: null,
        body: "Legacy one",
      }),
      dmRow({
        id: "legacy-2",
        notification_group_key: null,
        body: "Legacy two",
      }),
    ]);

    assert.equal(feed.length, 1);
    assert.equal(feed[0].id, "grouped");
    assert.equal(feed[0].feedMessageCount, 5);
  });

  it("sorts grouped DM cards by last_event_at or created_at", () => {
    const feed = collapseNotificationsForFeed([
      dmRow({
        id: "conv-b",
        conversation_id: "conv-b",
        actor_id: "actor-b",
        created_at: "2026-06-09T08:00:00.000Z",
      }),
      dmRow({
        id: "conv-a",
        conversation_id: "conv-a",
        actor_id: "actor-a",
        last_event_at: "2026-06-09T18:00:00.000Z",
        created_at: "2026-06-09T07:00:00.000Z",
      }),
    ]);

    assert.deepEqual(
      feed.map((item) => item.id),
      ["conv-a", "conv-b"],
    );
  });
});

describe("groupFeedItemsByDate", () => {
  it("uses grouped card timestamps for date sections", () => {
    const latestTimestamp = new Date().toISOString();
    const feed = collapseNotificationsForFeed([
      dmRow({
        created_at: "2020-01-01T08:00:00.000Z",
        last_event_at: latestTimestamp,
      }),
    ]);

    assert.equal(feedDateLabel(feed[0].feedTimestamp), "Today");

    const sections = groupFeedItemsByDate(feed);
    assert.equal(sections[0]?.label, "Today");
    assert.equal(sections[0]?.items.length, 1);
  });
});

describe("unreadNotificationBadgeTotal", () => {
  it("counts raw unread rows so badge totals stay correct after feed grouping", () => {
    const rows = [
      dmRow({ id: "grouped", notification_group_key: "dm:conv-1:user-2", read_at: null }),
      dmRow({ id: "legacy-hidden", read_at: null }),
      connectionRow({ id: "conn", read_at: null }),
      connectionRow({ id: "conn-read", read_at: "2026-06-09T10:00:00.000Z" }),
    ];

    assert.equal(unreadNotificationBadgeTotal(rows), 3);

    const feed = collapseNotificationsForFeed(rows);
    assert.equal(feed.length, 3);
    assert.equal(unreadNotificationBadgeTotal(rows), 3);
  });
});
