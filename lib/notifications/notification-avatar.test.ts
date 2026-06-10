import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NotificationItem } from "@/lib/notifications";
import {
  collectNotificationActorIds,
  notificationActorId,
  notificationUsesBrandedOrb,
  resolveNotificationLeadingVisual,
} from "@/lib/notifications/notification-avatar";

function baseNotification(
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    id: "n-1",
    type: "direct_message",
    title: "Message",
    body: "Hello",
    ride_id: null,
    conversation_id: "conv-1",
    actor_id: "actor-1",
    read_at: null,
    created_at: "2026-06-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("notificationUsesBrandedOrb", () => {
  it("returns true for shop and credits notifications", () => {
    assert.equal(notificationUsesBrandedOrb("shop_order_paid"), true);
    assert.equal(notificationUsesBrandedOrb("crimson_credits_reward"), true);
    assert.equal(notificationUsesBrandedOrb("admin_order_created"), true);
  });

  it("returns false for social and DM notifications", () => {
    assert.equal(notificationUsesBrandedOrb("direct_message"), false);
    assert.equal(notificationUsesBrandedOrb("connection_request"), false);
    assert.equal(notificationUsesBrandedOrb("meet_joined"), false);
  });
});

describe("notificationActorId", () => {
  it("prefers metadata actor for person notifications", () => {
    assert.equal(
      notificationActorId({
        type: "meet_joined",
        actor_id: "legacy-actor",
        last_actor_id: null,
        metadata: { actor_user_id: "meta-actor" },
      }),
      "meta-actor",
    );
  });

  it("returns null for branded orb notifications", () => {
    assert.equal(
      notificationActorId({
        type: "shop_order_paid",
        actor_id: "actor-1",
        last_actor_id: null,
        metadata: null,
      }),
      null,
    );
  });

  it("uses last_actor_id for grouped DMs", () => {
    assert.equal(
      notificationActorId({
        type: "direct_message",
        actor_id: "actor-old",
        last_actor_id: "actor-latest",
        metadata: null,
      }),
      "actor-latest",
    );
  });
});

describe("resolveNotificationLeadingVisual", () => {
  it("returns actor avatar for DM notifications", () => {
    const result = resolveNotificationLeadingVisual(
      {
        ...baseNotification(),
        feedMessageCount: 1,
        feedPreviewText: "Hello",
        feedTimestamp: "2026-06-09T12:00:00.000Z",
        isGroupedDirectMessage: false,
        user_id: "user-2",
      },
      {
        "actor-1": {
          id: "actor-1",
          username: "rider",
          display_name: "Rider One",
          full_name: null,
          profile_image_url: null,
          avatar_url: null,
        },
      },
    );

    assert.equal(result.kind, "actor-avatar");
    assert.equal(result.actor?.id, "actor-1");
  });

  it("returns crimson orb for shop notifications", () => {
    const result = resolveNotificationLeadingVisual(
      {
        ...baseNotification({ type: "shop_order_paid", actor_id: null }),
        feedMessageCount: 1,
        feedPreviewText: null,
        feedTimestamp: "2026-06-09T12:00:00.000Z",
        isGroupedDirectMessage: false,
        user_id: "user-2",
      },
      {},
    );

    assert.equal(result.kind, "crimson-orb");
    assert.equal(result.actor, null);
  });
});

describe("collectNotificationActorIds", () => {
  it("collects actor, last_actor, and metadata actor ids", () => {
    const ids = collectNotificationActorIds([
      baseNotification({ actor_id: "actor-1", last_actor_id: "actor-2" }),
      baseNotification({
        id: "n-2",
        type: "meet_joined",
        actor_id: null,
        metadata: { actor_user_id: "actor-3" },
      }),
      baseNotification({ id: "n-3", type: "shop_order_paid", actor_id: "ignored" }),
    ]);

    assert.deepEqual(new Set(ids), new Set(["actor-2", "actor-3"]));
  });
});
