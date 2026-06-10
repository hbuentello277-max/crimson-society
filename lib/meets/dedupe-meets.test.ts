import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dedupeMeetsById } from "@/lib/meets/dedupe-meets";

describe("dedupeMeetsById", () => {
  it("keeps the first meet for each id", () => {
    const meets = [
      { id: "a", name: "First" },
      { id: "b", name: "Only" },
      { id: "a", name: "Duplicate" },
    ];

    const result = dedupeMeetsById(meets);
    assert.equal(result.length, 2);
    assert.equal(result[0]?.name, "First");
    assert.equal(result[1]?.name, "Only");
  });
});
