import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNotificationClickData,
  normalizeMessageDeepLinkPath,
  resolveNotificationClickTarget,
} from "@/lib/push/notification-click-routing";

const origin = "https://crimson-society.com";

describe("resolveNotificationClickTarget", () => {
  it("prefers absolute url in notification data", () => {
    const result = resolveNotificationClickTarget(
      {
        url: "https://crimson-society.com/messages/conv-abc",
        type: "direct_message",
      },
      origin,
    );

    assert.equal(result.path, "/messages/conv-abc");
    assert.equal(result.source, "url");
  });

  it("resolves conversationId to message thread path", () => {
    const result = resolveNotificationClickTarget(
      { conversationId: "conv-abc", type: "direct_message" },
      origin,
    );

    assert.equal(result.path, "/messages/conv-abc");
    assert.equal(result.absoluteUrl, "https://crimson-society.com/messages/conv-abc");
  });
});

describe("normalizeMessageDeepLinkPath", () => {
  it("maps /messages/:id to inbox conversation query", () => {
    assert.equal(
      normalizeMessageDeepLinkPath("/messages/conv-abc"),
      "/inbox?conversation=conv-abc",
    );
  });
});

describe("buildNotificationClickData", () => {
  it("stores normalized inbox conversation url for message notifications", () => {
    const data = buildNotificationClickData(
      { conversationId: "conv-abc", type: "direct_message" },
      origin,
    );

    assert.equal(data.url, "https://crimson-society.com/inbox?conversation=conv-abc");
    assert.equal(data.conversationId, "conv-abc");
  });
});
