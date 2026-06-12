import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolvePushNotificationPath,
  resolvePushNotificationUrl,
} from "@/lib/notifications/push-url-resolve";

const origin = "https://crimson-society.com";

describe("resolvePushNotificationPath", () => {
  it("prefers targetUrl", () => {
    assert.equal(
      resolvePushNotificationPath({ targetUrl: "/profile/javi" }),
      "/profile/javi",
    );
  });

  it("resolves connect request by requestId", () => {
    assert.equal(
      resolvePushNotificationPath({ requestId: "req-1" }),
      "/connect/requests/req-1",
    );
  });

  it("resolves meet chat by rideId", () => {
    assert.equal(
      resolvePushNotificationPath({ rideId: "meet-9", type: "meet_chat_message" }),
      "/meets/meet-9?section=chat",
    );
  });

  it("resolves meet detail by rideId", () => {
    assert.equal(
      resolvePushNotificationPath({ rideId: "meet-9", type: "meet_joined" }),
      "/meets/meet-9",
    );
  });

  it("resolves direct message thread by conversationId", () => {
    assert.equal(
      resolvePushNotificationPath({ conversationId: "conv-1", type: "direct_message" }),
      "/messages/conv-1",
    );
  });

  it("resolves SOS chat by conversationId", () => {
    assert.equal(
      resolvePushNotificationPath({ conversationId: "conv-1", type: "sos_chat_message" }),
      "/inbox?conversation=conv-1",
    );
  });

  it("resolves SOS alert detail by entityId", () => {
    assert.equal(
      resolvePushNotificationPath({ entityId: "alert-1", type: "sos_activated" }),
      "/rider-sos/alerts/alert-1",
    );
  });

  it("resolves admin order by orderId for buyer paths", () => {
    assert.equal(
      resolvePushNotificationPath({ orderId: "order-5" }),
      "/profile/orders/order-5",
    );
  });

  it("falls back for missing meet target", () => {
    assert.equal(resolvePushNotificationPath({ type: "meet_joined" }), "/meets");
  });

  it("falls back for missing message thread", () => {
    assert.equal(resolvePushNotificationPath({ type: "direct_message" }), "/messages");
  });

  it("falls back for missing SOS target", () => {
    assert.equal(resolvePushNotificationPath({ type: "sos_arrived" }), "/rider-sos");
  });

  it("falls back for admin shop types", () => {
    assert.equal(resolvePushNotificationPath({ type: "admin_order_paid" }), "/admin/shop");
  });
});

describe("resolvePushNotificationUrl", () => {
  it("builds absolute lock-screen URLs", () => {
    assert.equal(
      resolvePushNotificationUrl({ targetUrl: "/profile/javi" }, origin),
      "https://crimson-society.com/profile/javi",
    );
  });

  it("defaults to inbox when no route data exists", () => {
    assert.equal(
      resolvePushNotificationUrl({}, origin),
      "https://crimson-society.com/inbox?tab=notifications",
    );
  });
});
