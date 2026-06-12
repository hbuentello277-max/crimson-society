import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sosChatHref } from "@/lib/rider-sos/chat";

describe("rider sos chat helpers", () => {
  it("builds inbox deep links for SOS conversations", () => {
    assert.equal(sosChatHref("conversation-1"), "/inbox?conversation=conversation-1");
  });

  it("encodes conversation ids defensively", () => {
    assert.equal(sosChatHref("conversation/1"), "/inbox?conversation=conversation%2F1");
  });
});

