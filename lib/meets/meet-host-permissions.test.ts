import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canManageMeet,
  isAnyMeetHost,
  isMeetCoHost,
  isPrimaryMeetHost,
} from "@/lib/meets/meet-host-permissions";

describe("meet host permissions", () => {
  const meet = { hostId: "host-1", coHostId: "cohost-1" };

  it("identifies primary host and co-host", () => {
    assert.equal(isPrimaryMeetHost(meet, "host-1"), true);
    assert.equal(isMeetCoHost(meet, "cohost-1"), true);
    assert.equal(isAnyMeetHost(meet, "cohost-1"), true);
    assert.equal(canManageMeet(meet, "cohost-1"), true);
    assert.equal(canManageMeet(meet, "rider-2"), false);
  });
});
