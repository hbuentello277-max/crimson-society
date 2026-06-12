import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminOrderNotificationPath,
  adminShopPath,
  connectionRequestReviewPath,
  meetNotificationPath,
  messageThreadPath,
  notificationDestination,
  orderNotificationPath,
  postNotificationPath,
  shouldNotifyPostOwner,
} from "@/lib/notifications";
import { buildNotificationPushMetadata } from "@/lib/notifications/push-metadata";
import { riderSosGroupKey } from "@/lib/notifications/grouping";

const actor = {
  id: "actor-1",
  username: "javi",
  display_name: "Javi",
  full_name: null,
  profile_image_url: null,
  avatar_url: null,
};

describe("follow notifications", () => {
  it("opens the follower profile for follow", () => {
    assert.equal(
      notificationDestination(
        {
          type: "follow",
          ride_id: null,
          target_url: "/profile/javi",
          metadata: { entity_type: "follow", actor_username: "javi" },
        },
        actor,
      ),
      "/profile/javi",
    );
  });

  it("falls back to /connect when follower profile is missing", () => {
    assert.equal(
      notificationDestination({ type: "follow", ride_id: null }, null),
      "/connect",
    );
  });
});

describe("post like notifications", () => {
  it("opens the liked post", () => {
    assert.equal(
      notificationDestination(
        {
          type: "post_like",
          ride_id: null,
          post_id: "post-1",
          target_url: postNotificationPath("post-1"),
        },
        actor,
      ),
      "/dashboard?post=post-1",
    );
  });

  it("does not notify when user likes own post", () => {
    assert.equal(shouldNotifyPostOwner("user-1", "user-1"), false);
    assert.equal(shouldNotifyPostOwner("user-1", "user-2"), true);
  });
});

describe("post comment notifications", () => {
  it("opens the post comment thread", () => {
    assert.equal(
      notificationDestination(
        {
          type: "post_comment",
          ride_id: null,
          post_id: "post-9",
          comment_id: "comment-3",
          target_url: postNotificationPath("post-9", "comment-3"),
        },
        actor,
      ),
      "/dashboard?post=post-9&comment=comment-3",
    );
  });

  it("does not notify when user comments on own post", () => {
    assert.equal(shouldNotifyPostOwner("owner-1", "owner-1"), false);
  });
});

describe("order notifications", () => {
  it("opens order detail for order_preparing", () => {
    assert.equal(
      notificationDestination(
        {
          type: "order_preparing",
          ride_id: null,
          metadata: { order_id: "order-22", entity_type: "order_preparing" },
        },
        null,
      ),
      orderNotificationPath("order-22"),
    );
  });

  it("opens order detail for order_shipped", () => {
    assert.equal(
      notificationDestination(
        {
          type: "order_shipped",
          ride_id: null,
          target_url: orderNotificationPath("order-44"),
        },
        null,
      ),
      "/profile/orders/order-44",
    );
  });

  it("falls back to /profile/orders when order id is missing", () => {
    assert.equal(
      notificationDestination({ type: "order_shipped", ride_id: null }, null),
      "/profile/orders",
    );
  });
});

describe("connect notifications", () => {
  it("opens request review for connection_request", () => {
    assert.equal(
      notificationDestination(
        {
          type: "connection_request",
          ride_id: null,
          target_url: connectionRequestReviewPath("req-1"),
        },
        actor,
      ),
      "/connect/requests/req-1",
    );
  });

  it("opens approver profile for connection_accepted", () => {
    assert.equal(
      notificationDestination(
        {
          type: "connection_accepted",
          ride_id: null,
          target_url: "/profile/crimson",
        },
        {
          ...actor,
          username: "crimson",
        },
      ),
      "/profile/crimson",
    );
  });
});

describe("meet notifications", () => {
  it("opens meet detail for meet_joined", () => {
    assert.equal(
      notificationDestination(
        {
          type: "meet_joined",
          ride_id: "meet-1",
          target_url: meetNotificationPath("meet-1"),
        },
        actor,
      ),
      "/meets/meet-1",
    );
  });

  it("opens meet chat for meet_chat_message", () => {
    assert.equal(
      notificationDestination(
        {
          type: "meet_chat_message",
          ride_id: "meet-2",
        },
        null,
      ),
      "/meets/meet-2?section=chat",
    );
  });

  it("opens meet detail for meet_reminder", () => {
    assert.equal(
      notificationDestination(
        { type: "meet_reminder", ride_id: "meet-3" },
        null,
      ),
      "/meets/meet-3",
    );
  });
});

describe("rider sos notifications", () => {
  it("opens rider SOS alert detail for SOS notifications", () => {
    for (const type of ["sos_activated", "sos_responded", "sos_arrived"] as const) {
      assert.equal(
        notificationDestination(
          {
            type,
            ride_id: null,
            metadata: {
              entity_type: "rider_sos",
              entity_id: "alert-1",
              sos_alert_id: "alert-1",
            },
          },
          null,
        ),
        "/rider-sos/alerts/alert-1",
      );
    }
  });

  it("includes SOS entity id and target URL in push metadata", () => {
    const payload = buildNotificationPushMetadata(
      {
        id: "notification-1",
        type: "sos_activated",
        ride_id: null,
        target_url: "/rider-sos/alerts/alert-9",
        metadata: {
          entity_type: "rider_sos",
          entity_id: "alert-9",
          sos_alert_id: "alert-9",
        },
        notification_group_key: "rider_sos:sos_activated:alert-9:rider-2",
      },
      null,
      "https://crimsonsociety.app",
    );

    assert.equal(payload.entityId, "alert-9");
    assert.equal(payload.targetUrl, "https://crimsonsociety.app/rider-sos/alerts/alert-9");
    assert.equal(payload.groupKey, "rider_sos:sos_activated:alert-9:rider-2");
  });

  it("builds deterministic SOS notification group keys", () => {
    assert.equal(
      riderSosGroupKey("sos_arrived", "alert-1", "owner-1"),
      "rider_sos:sos_arrived:alert-1:owner-1",
    );
    assert.notEqual(
      riderSosGroupKey("sos_responded", "alert-1", "owner-1"),
      riderSosGroupKey("sos_arrived", "alert-1", "owner-1"),
    );
  });
});

describe("admin shop notifications", () => {
  it("opens admin order detail for admin_order_paid", () => {
    assert.equal(
      notificationDestination(
        {
          type: "admin_order_paid",
          ride_id: null,
          metadata: { order_id: "order-88" },
        },
        null,
      ),
      adminOrderNotificationPath("order-88"),
    );
  });

  it("falls back to admin shop for missing order id", () => {
    assert.equal(
      notificationDestination({ type: "admin_order_created", ride_id: null }, null),
      adminShopPath(),
    );
  });

  it("opens admin shop for low inventory", () => {
    assert.equal(
      notificationDestination({ type: "admin_low_inventory", ride_id: null }, null),
      adminShopPath(),
    );
  });
});

describe("buyer order lifecycle notifications", () => {
  it("opens order detail for order_delivered", () => {
    assert.equal(
      notificationDestination(
        {
          type: "order_delivered",
          ride_id: null,
          target_url: orderNotificationPath("order-delivered-1"),
          metadata: { order_id: "order-delivered-1", entity_type: "order_delivered" },
        },
        null,
      ),
      "/profile/orders/order-delivered-1",
    );
  });

  it("opens order detail for order_created and order_confirmed", () => {
    for (const type of ["order_created", "order_confirmed", "order_ready_to_ship", "order_completed"] as const) {
      assert.equal(
        notificationDestination(
          {
            type,
            ride_id: null,
            metadata: { order_id: "order-1" },
          },
          null,
        ),
        orderNotificationPath("order-1"),
      );
    }
  });
});

describe("direct message notifications", () => {
  it("opens message thread path", () => {
    assert.equal(
      notificationDestination(
        {
          type: "direct_message",
          ride_id: null,
          conversation_id: "thread-9",
        },
        null,
      ),
      messageThreadPath("thread-9"),
    );
  });
});

describe("inbox fallbacks", () => {
  it("falls back to /dashboard for missing post route data", () => {
    assert.equal(
      notificationDestination({ type: "post_like", ride_id: null }, null),
      "/dashboard",
    );
  });

  it("falls back to /messages for direct messages without conversation id", () => {
    assert.equal(
      notificationDestination({ type: "direct_message", ride_id: null }, null),
      "/messages",
    );
  });

  it("falls back to /meets for meet notifications without ride id", () => {
    assert.equal(
      notificationDestination({ type: "meet_joined", ride_id: null }, null),
      "/meets",
    );
  });
});

describe("push payload metadata", () => {
  it("includes target_url and entity fields for follow", () => {
    const payload = buildNotificationPushMetadata(
      {
        type: "follow",
        ride_id: null,
        actor_id: "actor-1",
        target_url: "/profile/javi",
        metadata: { actor_username: "javi", entity_type: "follow", entity_id: "actor-1" },
      },
      actor,
      "https://crimson-society.com",
    );

    assert.equal(payload.targetUrl, "https://crimson-society.com/profile/javi");
    assert.equal(payload.actorUsername, "javi");
    assert.equal(payload.entityId, "actor-1");
  });

  it("includes post and order ids for social and commerce notifications", () => {
    const postPayload = buildNotificationPushMetadata(
      {
        type: "post_like",
        ride_id: null,
        actor_id: "actor-1",
        post_id: "post-1",
        target_url: "/dashboard?post=post-1",
        metadata: { post_id: "post-1", entity_type: "post_like" },
      },
      actor,
      "https://crimson-society.com",
    );
    assert.equal(postPayload.postId, "post-1");
    assert.match(postPayload.targetUrl, /post=post-1/);

    const orderPayload = buildNotificationPushMetadata(
      {
        type: "order_shipped",
        ride_id: null,
        target_url: "/profile/orders/order-9",
        metadata: { order_id: "order-9", entity_type: "order_shipped" },
      },
      null,
      "https://crimson-society.com",
    );
    assert.equal(orderPayload.orderId, "order-9");
    assert.equal(orderPayload.targetUrl, "https://crimson-society.com/profile/orders/order-9");
  });

  it("includes orderId and targetUrl for order_delivered pushes", () => {
    const payload = buildNotificationPushMetadata(
      {
        type: "order_delivered",
        ride_id: null,
        target_url: orderNotificationPath("order-77"),
        metadata: { order_id: "order-77", entity_type: "order_delivered" },
      },
      null,
      "https://crimson-society.com",
    );

    assert.equal(payload.orderId, "order-77");
    assert.equal(payload.targetUrl, "https://crimson-society.com/profile/orders/order-77");
    assert.equal(payload.type, "order_delivered");
  });

  it("includes groupKey for grouped notifications", () => {
    const payload = buildNotificationPushMetadata(
      {
        id: "n-1",
        type: "meet_chat_message",
        ride_id: "meet-1",
        user_id: "user-2",
        notification_group_key: "meet_chat:meet-1:user-2",
        target_url: "/meets/meet-1?section=chat",
      },
      actor,
      "https://crimson-society.com",
    );

    assert.equal(payload.groupKey, "meet_chat:meet-1:user-2");
    assert.equal(payload.rideId, "meet-1");
  });

  it("includes request id for connect request pushes", () => {
    const payload = buildNotificationPushMetadata(
      {
        type: "connection_request",
        ride_id: null,
        actor_id: "actor-1",
        target_url: "/connect/requests/req-5",
        metadata: {
          request_id: "req-5",
          connection_id: "req-5",
          actor_username: "javi",
        },
      },
      actor,
      "https://crimson-society.com",
    );

    assert.equal(payload.requestId, "req-5");
    assert.equal(payload.targetUrl, "https://crimson-society.com/connect/requests/req-5");
  });
});
