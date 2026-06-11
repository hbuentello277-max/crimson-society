import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInviteRidersShareMessage,
  buildInviteRidersShareUrl,
} from "@/lib/credits/invite-riders-share";

describe("invite riders share helpers", () => {
  it("builds the required share message format", () => {
    const message = buildInviteRidersShareMessage("JAVI10", "https://crimson-society.com");
    assert.match(message, /Join me on Crimson Society\./);
    assert.match(message, /Use my referral code: JAVI10/);
    assert.match(message, /https:\/\/crimson-society\.com/);
  });

  it("builds signup share url with referral code", () => {
    const url = buildInviteRidersShareUrl("rider-210", "https://crimson-society.com");
    assert.equal(url, "https://crimson-society.com/signup?ref=rider-210");
  });
});
