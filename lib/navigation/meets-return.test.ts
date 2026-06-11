import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blackcardLeaderboardHref,
  isMeetsReturnContext,
} from "@/lib/navigation/meets-return";

describe("meets return navigation", () => {
  it("builds leaderboard href with meets return context", () => {
    assert.equal(
      blackcardLeaderboardHref(true),
      "/profile/blackcard-leaderboard?from=meets",
    );
  });

  it("detects meets return query param", () => {
    assert.equal(isMeetsReturnContext("?from=meets"), true);
    assert.equal(isMeetsReturnContext(new URLSearchParams("from=meets")), true);
    assert.equal(isMeetsReturnContext("?from=profile"), false);
  });
});
