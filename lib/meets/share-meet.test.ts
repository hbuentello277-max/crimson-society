import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMeetPublicSharePayload,
  copyMeetLink,
  shareMeetLink,
} from "@/lib/meets/share-meet";

describe("share meet helpers", () => {
  it("builds public share payload with host and meet url", () => {
    const payload = buildMeetPublicSharePayload({
      meetId: "meet-1",
      meetName: "Saturday Night Ride",
      hostName: "Javi",
      origin: "https://www.crimson-society.com",
    });

    assert.equal(payload.url, "https://www.crimson-society.com/meets/meet-1");
    assert.match(payload.text, /Saturday Night Ride/);
    assert.match(payload.text, /Hosted by Javi/);
    assert.match(payload.text, /Join us on Crimson Society/);
  });

  it("returns a browser-only error outside the window", async () => {
    const shareResult = await shareMeetLink({
      meetId: "meet-1",
      meetName: "Night Run",
      hostName: "Javi",
    });
    const copyResult = await copyMeetLink({ meetId: "meet-1" });

    assert.equal(shareResult.ok, false);
    assert.equal(copyResult.ok, false);
  });
});
