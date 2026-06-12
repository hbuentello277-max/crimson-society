import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("FCM APNs payload shape", () => {
  it("documents required APNs alert fields for native iOS delivery", () => {
    const payload = {
      title: "New message",
      body: "Rider said hello",
      url: "https://crimsonsociety.app/messages/abc",
      notificationId: "notif-1",
      type: "direct_message" as const,
    };

    const collapseKey = payload.notificationId;
    const message = {
      token: "native-token",
      data: {
        title: payload.title,
        body: payload.body,
        url: payload.url,
        notificationId: payload.notificationId,
        type: payload.type,
        targetUrl: payload.url,
      },
      notification: {
        title: payload.title,
        body: payload.body,
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-collapse-id": collapseKey.slice(0, 64),
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: "default",
          },
        },
        fcm_options: {
          link: payload.url,
        },
      },
    };

    assert.equal(message.apns.payload.aps.alert.title, payload.title);
    assert.equal(message.notification.body, payload.body);
    assert.equal(message.data.targetUrl, payload.url);
  });
});
