import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatRiderHandle,
  formatRiderIdentity,
  normalizeUsernameValue,
  riderIdentityInitial,
} from "@/lib/rider-identity";

describe("rider identity helpers", () => {
  it("normalizes usernames and avoids double @", () => {
    assert.equal(normalizeUsernameValue("@@JJAYMICK001"), "JJAYMICK001");
    assert.equal(formatRiderHandle("@@jjaymick001"), "@jjaymick001");
    assert.equal(formatRiderHandle(null, "@member"), "@member");
  });

  it("prefers @username over display name outside profile pages", () => {
    assert.equal(
      formatRiderIdentity({
        username: "jjaymick001",
        display_name: "Jjaymickool",
      }),
      "@jjaymick001",
    );
  });

  it("falls back to display name then rider label", () => {
    assert.equal(
      formatRiderIdentity({ display_name: "Sara Negrete" }),
      "Sara Negrete",
    );
    assert.equal(formatRiderIdentity({}), "Rider");
    assert.equal(formatRiderIdentity(null, { fallback: "Crimson Member" }), "Crimson Member");
  });

  it("derives avatar initials from identity", () => {
    assert.equal(riderIdentityInitial("@motobabe88"), "M");
    assert.equal(riderIdentityInitial("Sara"), "S");
  });
});
