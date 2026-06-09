import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { CRIMSON_REWARDS_SIZES } from "@/components/credits/CrimsonRewardsIcon";

describe("CrimsonRewardsIcon", () => {
  it("exports standard rewards icon sizes", () => {
    assert.deepEqual(CRIMSON_REWARDS_SIZES, [20, 24, 32, 48]);
  });

  it("uses the shared crown glyph without coin graphics", () => {
    const source = readFileSync(
      path.join(process.cwd(), "components/credits/CrimsonRewardsIcon.tsx"),
      "utf8",
    );
    assert.match(source, /👑/);
    assert.doesNotMatch(source, /<svg/i);
    assert.doesNotMatch(source, /<circle/i);
    assert.doesNotMatch(source, /coin/i);
    assert.doesNotMatch(source, /swirl/i);
  });
});
