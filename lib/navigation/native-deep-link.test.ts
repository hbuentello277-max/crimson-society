import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveNativeDeepLinkAction } from "@/lib/navigation/native-deep-link";

const ORIGINS = ["https://crimsonsociety.app"];

describe("resolveNativeDeepLinkAction", () => {
  it("full-loads auth callback universal links", () => {
    const action = resolveNativeDeepLinkAction(
      "https://crimsonsociety.app/auth/callback?code=abc&next=%2Freset-password",
      ORIGINS,
    );
    assert.deepEqual(action, {
      type: "full-load",
      href: "https://crimsonsociety.app/auth/callback?code=abc&next=%2Freset-password",
    });
  });

  it("client-navigates password reset", () => {
    const action = resolveNativeDeepLinkAction(
      "https://crimsonsociety.app/reset-password",
      ORIGINS,
    );
    assert.deepEqual(action, { type: "client-navigate", path: "/reset-password" });
  });

  it("client-navigates inbox and messages", () => {
    assert.deepEqual(
      resolveNativeDeepLinkAction("https://crimsonsociety.app/inbox?tab=notifications", ORIGINS),
      { type: "client-navigate", path: "/inbox?tab=notifications" },
    );
    assert.deepEqual(
      resolveNativeDeepLinkAction("https://crimsonsociety.app/messages/conv-1", ORIGINS),
      { type: "client-navigate", path: "/messages/conv-1" },
    );
  });

  it("client-navigates meets and dashboard notification links", () => {
    assert.deepEqual(
      resolveNativeDeepLinkAction("https://crimsonsociety.app/meets/ride-1?section=chat", ORIGINS),
      { type: "client-navigate", path: "/meets/ride-1?section=chat" },
    );
    assert.deepEqual(
      resolveNativeDeepLinkAction(
        "https://crimsonsociety.app/dashboard?post=p1&comment=c1",
        ORIGINS,
      ),
      { type: "client-navigate", path: "/dashboard?post=p1&comment=c1" },
    );
  });

  it("client-navigates profile and stripe success URLs", () => {
    assert.deepEqual(
      resolveNativeDeepLinkAction("https://crimsonsociety.app/profile/rider-one", ORIGINS),
      { type: "client-navigate", path: "/profile/rider-one" },
    );
    assert.deepEqual(
      resolveNativeDeepLinkAction(
        "https://crimsonsociety.app/checkout/success?session_id=cs_test",
        ORIGINS,
      ),
      { type: "client-navigate", path: "/checkout/success?session_id=cs_test" },
    );
    assert.deepEqual(
      resolveNativeDeepLinkAction(
        "https://crimsonsociety.app/shop/checkout/success?session_id=cs_test",
        ORIGINS,
      ),
      { type: "client-navigate", path: "/shop/checkout/success?session_id=cs_test" },
    );
  });

  it("supports custom scheme fallback for auth callback", () => {
    const action = resolveNativeDeepLinkAction(
      "crimsonsociety://auth/callback?code=abc",
      ORIGINS,
    );
    assert.deepEqual(action, {
      type: "full-load",
      href: "https://crimsonsociety.app/auth/callback?code=abc",
    });
  });

  it("ignores external origins", () => {
    const action = resolveNativeDeepLinkAction("https://evil.example/phish", ORIGINS);
    assert.deepEqual(action, { type: "ignore" });
  });
});
