import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACHIEVEMENT_MILESTONE_GROUPS,
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
    assert.equal(formatted.detailLine, "Attended 10 Meets. June 15, 2026");
  });

  it("uses the generic achievement copy when a reason is missing", () => {
    const formatted = formatAchievementMilestoneLine(
      100,
      null,
      "2026-08-02T12:00:00.000Z",
    );
    assert.equal(formatted.amountLine, "+100 Crimson Credits");
    assert.equal(formatted.detailLine, "Achievement milestone earned. August 2, 2026");
  });

  it("defines milestone reward groups for How It Works", () => {
    assert.equal(ACHIEVEMENT_MILESTONE_GROUPS.length, 4);
    assert.equal(
      ACHIEVEMENT_MILESTONE_GROUPS[0]?.milestones[0]?.credits,
      50,
    );
  });
});
