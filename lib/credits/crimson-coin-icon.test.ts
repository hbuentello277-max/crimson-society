import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { CRIMSON_REWARDS_SIZES } from "@/components/credits/CrimsonRewardsIcon";

describe("CrimsonRewardsIcon", () => {
  it("exports standard rewards icon sizes", () => {
    assert.deepEqual(CRIMSON_REWARDS_SIZES, [20, 24, 32, 48]);
  });

  it("defines flat crimson crown branding without coin or emoji graphics", () => {
    const source = readFileSync(
      path.join(process.cwd(), "components/credits/CrimsonRewardsIcon.tsx"),
      "utf8",
    );
    assert.match(source, /viewBox="0 0 24 24"/);
    assert.match(source, /#e87a82/);
    assert.match(source, /#b4141e/);
    assert.doesNotMatch(source, /👑/);
    assert.doesNotMatch(source, /#d4a84a/i);
    assert.doesNotMatch(source, /<circle/i);
    assert.doesNotMatch(source, /coin/i);
    assert.doesNotMatch(source, /swirl/i);
  });
});
