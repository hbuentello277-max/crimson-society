import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFoundingLeaderboardPoints,
  foundingLeaderboardRowPoints,
  parseFoundingLeaderboardPayload,
} from "@/lib/growth/founding-leaderboard";

describe("founding leaderboard display helpers", () => {
  it("formats leaderboard points consistently", () => {
    assert.equal(formatFoundingLeaderboardPoints(100), "100 points");
    assert.equal(formatFoundingLeaderboardPoints(0), "0 points");
  });

  it("uses the same row points value for preview display", () => {
    const payload = parseFoundingLeaderboardPayload({
      entries: [
        {
          rank: 1,
          user_id: "user-1",
          username: "the_javi_r1",
          display_name: "Javi Buentello",
          avatar_url: null,
          points: 100,
          credits_balance: 0,
          is_current_user: false,
          in_top_15: true,
        },
      ],
      current_user: {},
      top_n: 15,
      cutoff_points: 100,
    });

    const entry = payload.entries[0];
    assert.ok(entry);
    assert.equal(foundingLeaderboardRowPoints(entry), 100);
    assert.equal(formatFoundingLeaderboardPoints(foundingLeaderboardRowPoints(entry)), "100 points");
  });

  it("does not surface zero preview points when row points are positive", () => {
    const entry = parseFoundingLeaderboardPayload({
      entries: [
        {
          rank: 2,
          user_id: "user-2",
          points: 75,
          credits_balance: 0,
        },
      ],
    }).entries[0];

    assert.ok(entry);
    assert.equal(entry.creditsBalance, 0);
    assert.equal(foundingLeaderboardRowPoints(entry), 75);
    assert.notEqual(foundingLeaderboardRowPoints(entry), entry.creditsBalance);
  });
});
