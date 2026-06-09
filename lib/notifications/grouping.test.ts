import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminReportQueueGroupKey,
  connectRequestGroupKey,
  directMessageGroupKey,
  groupedNotificationCount,
  meetJoinedGroupKey,
  meetReminderGroupKey,
  meetUpdatedGroupKey,
  postCommentedGroupKey,
  postLikedGroupKey,
  profileFollowedGroupKey,
  pushCollapseKey,
  shopOrderGroupKey,
} from "@/lib/notifications/grouping";
import { notificationDestination } from "@/lib/notifications";

describe("notification group keys", () => {
  it("builds direct message keys per conversation and recipient", () => {
    assert.equal(
      directMessageGroupKey("conv-1", "user-2"),
      "dm:conv-1:user-2",
    );
  });

  it("builds meet joined keys per meet and host", () => {
    assert.equal(
      meetJoinedGroupKey("meet-9", "host-1"),
      "meet_joined:meet-9:host-1",
    );
  });

  it("builds profile followed keys per recipient", () => {
    assert.equal(profileFollowedGroupKey("user-5"), "profile_followed:user-5");
  });

  it("builds shop order keys per order and user", () => {
    assert.equal(shopOrderGroupKey("order-3", "user-7"), "order:order-3:user-7");
  });

  it("builds connect, meet update, reminder, and moderation keys", () => {
    assert.equal(connectRequestGroupKey("req-1", "recv-2"), "connect_request:req-1:recv-2");
    assert.equal(meetUpdatedGroupKey("meet-1", "user-2"), "meet_updated:meet-1:user-2");
    assert.equal(meetReminderGroupKey("meet-1", "user-2"), "meet_reminder:meet-1:user-2");
    assert.equal(adminReportQueueGroupKey("admin-1"), "admin_report_queue:admin-1");
    assert.equal(postLikedGroupKey("post-1", "owner-1"), "post_liked:post-1:owner-1");
    assert.equal(postCommentedGroupKey("post-1", "owner-1"), "post_commented:post-1:owner-1");
  });
});

describe("pushCollapseKey", () => {
  it("prefers stored notification_group_key", () => {
    assert.equal(
      pushCollapseKey({
        id: "n-1",
        type: "direct_message",
        notification_group_key: "dm:conv-1:user-2",
        conversation_id: "conv-1",
        ride_id: null,
        post_id: null,
        user_id: "user-2",
      }),
      "dm:conv-1:user-2",
    );
  });

  it("falls back to conversation-scoped DM key", () => {
    assert.equal(
      pushCollapseKey({
        id: "n-2",
        type: "direct_message",
        notification_group_key: null,
        conversation_id: "conv-9",
        ride_id: null,
        post_id: null,
        user_id: "user-4",
      }),
      "dm:conv-9:user-4",
    );
  });

  it("uses notification id when no group context exists", () => {
    assert.equal(
      pushCollapseKey({
        id: "n-unique",
        type: "post_liked",
        notification_group_key: null,
        conversation_id: null,
        ride_id: null,
        post_id: "post-1",
      }),
      "n-unique",
    );
  });
});

describe("groupedNotificationCount", () => {
  it("never returns less than one", () => {
    assert.equal(groupedNotificationCount({ notification_count: 0 }), 1);
    assert.equal(groupedNotificationCount({ notification_count: 4 }), 4);
  });
});

describe("direct message destination", () => {
  it("opens the grouped conversation thread", () => {
    assert.equal(
      notificationDestination(
        {
          type: "direct_message",
          ride_id: null,
          conversation_id: "conv-abc",
          target_url: "/inbox?conversation=conv-abc",
        },
        null,
      ),
      "/inbox?conversation=conv-abc",
    );
  });
});
