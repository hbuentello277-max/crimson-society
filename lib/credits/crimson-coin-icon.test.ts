import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { CRIMSON_COIN_SIZES } from "@/components/credits/CrimsonCoinIcon";

describe("CrimsonCoinIcon", () => {
  it("exports standard credit icon sizes", () => {
    assert.deepEqual(CRIMSON_COIN_SIZES, [20, 24, 32, 48]);
  });

  it("defines crimson coin svg branding without crest image", () => {
    const source = readFileSync(
      path.join(process.cwd(), "components/credits/CrimsonCoinIcon.tsx"),
      "utf8",
    );
    assert.match(source, /viewBox="0 0 48 48"/);
    assert.match(source, /#b4141e/);
    assert.doesNotMatch(source, /icon\.png/);
  });
});
