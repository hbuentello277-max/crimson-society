import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatNavBadgeCount } from "@/lib/nav-badge-format";

describe("formatNavBadgeCount", () => {
  it("shows exact counts from 1 through 9", () => {
    for (let count = 1; count <= 9; count += 1) {
      assert.equal(formatNavBadgeCount(count), String(count));
    }
  });

  it("caps double-digit counts at 9+", () => {
    assert.equal(formatNavBadgeCount(10), "9+");
    assert.equal(formatNavBadgeCount(99), "9+");
  });

  it("caps triple-digit counts at 99+", () => {
    assert.equal(formatNavBadgeCount(100), "99+");
    assert.equal(formatNavBadgeCount(250), "99+");
  });
});
