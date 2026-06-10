import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appIconBadgeLabel } from "@/lib/app-icon-badge";

describe("appIconBadgeLabel", () => {
  it("returns null for zero", () => {
    assert.equal(appIconBadgeLabel(0), null);
  });

  it("uses native-style caps", () => {
    assert.equal(appIconBadgeLabel(3), "3");
    assert.equal(appIconBadgeLabel(12), "9+");
    assert.equal(appIconBadgeLabel(150), "99+");
  });
});
