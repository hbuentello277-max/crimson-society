import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatAchievementMilestoneLine,
  isAchievementMilestoneTransaction,
} from "@/lib/credits/achievements";

describe("achievement milestones", () => {
  it("detects achievement milestone transactions", () => {
    assert.equal(isAchievementMilestoneTransaction("achievement_milestone"), true);
    assert.equal(isAchievementMilestoneTransaction("meet_hosted"), false);
  });

  it("formats achievement milestone lines", () => {
    const formatted = formatAchievementMilestoneLine(
      50,
      "Attended 10 Meets.",
      "2026-06-15T12:00:00.000Z",
    );
    assert.equal(formatted.amountLine, "+50 Crimson Credits");
    assert.match(formatted.detailLine, /Attended 10 Meets/);
    assert.match(formatted.detailLine, /2026/);
  });
});
