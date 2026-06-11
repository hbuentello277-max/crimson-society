import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blackcardLeaderboardHref,
  getMeetDetailSource,
  isDashboardMeetReturnContext,
  isMeetsReturnContext,
  meetDetailCloseHref,
  meetDetailHref,
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

  it("builds dashboard meet detail links and close targets", () => {
    assert.equal(meetDetailHref("meet-1", "dashboard"), "/meets?meet=meet-1&from=dashboard");
    assert.equal(getMeetDetailSource("?meet=meet-1&from=dashboard"), "dashboard");
    assert.equal(isDashboardMeetReturnContext("?from=dashboard"), true);
    assert.equal(meetDetailCloseHref("dashboard"), "/dashboard");
    assert.equal(meetDetailCloseHref("meets"), "/meets");
    assert.equal(meetDetailCloseHref(null), "/meets");
  });
});
