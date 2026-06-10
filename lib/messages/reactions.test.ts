import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyReactionToggle,
  groupReactionsByEmoji,
  planReactionToggle,
  type MessageReactionRow,
} from "@/lib/messages/reactions";

const reactions: MessageReactionRow[] = [
  { id: "r-1", message_id: "m-1", user_id: "u-1", emoji: "👍" },
  { id: "r-2", message_id: "m-1", user_id: "u-2", emoji: "👍" },
  { id: "r-3", message_id: "m-1", user_id: "u-1", emoji: "❤️" },
  { id: "r-4", message_id: "m-2", user_id: "u-2", emoji: "🔥" },
];

describe("groupReactionsByEmoji", () => {
  it("groups reactions by emoji with counts", () => {
    const chips = groupReactionsByEmoji(reactions, "u-1", "m-1");

    assert.deepEqual(chips, [
      { emoji: "👍", count: 2, reactedByMe: true },
      { emoji: "❤️", count: 1, reactedByMe: true },
    ]);
  });

  it("marks reactedByMe false for emojis the current user did not use", () => {
    const chips = groupReactionsByEmoji(reactions, "u-3", "m-1");

    assert.deepEqual(chips, [
      { emoji: "👍", count: 2, reactedByMe: false },
      { emoji: "❤️", count: 1, reactedByMe: false },
    ]);
  });
});

describe("planReactionToggle", () => {
  it("plans removal when the current user already reacted", () => {
    assert.deepEqual(planReactionToggle(reactions, "m-1", "u-1", "👍"), {
      action: "remove",
      reactionId: "r-1",
    });
  });

  it("plans add when the current user has not reacted", () => {
    assert.deepEqual(planReactionToggle(reactions, "m-1", "u-3", "🔥"), {
      action: "add",
    });
  });
});

describe("applyReactionToggle", () => {
  it("adds a reaction optimistically", () => {
    const next = applyReactionToggle(reactions, "m-1", "u-3", "🔥");

    assert.equal(
      next.filter((reaction) => reaction.message_id === "m-1" && reaction.emoji === "🔥").length,
      1,
    );
  });

  it("removes the current user reaction on toggle", () => {
    const next = applyReactionToggle(reactions, "m-1", "u-1", "👍", "r-1");

    assert.equal(
      next.some(
        (reaction) => reaction.message_id === "m-1" && reaction.user_id === "u-1" && reaction.emoji === "👍",
      ),
      false,
    );
  });

  it("prevents duplicate same-user same-message same-emoji reactions", () => {
    const seeded = applyReactionToggle(reactions, "m-1", "u-3", "🔥");
    const again = applyReactionToggle(seeded, "m-1", "u-3", "🔥", "optimistic-m-1-u-3-🔥");

    assert.equal(
      again.filter(
        (reaction) =>
          reaction.message_id === "m-1" && reaction.user_id === "u-3" && reaction.emoji === "🔥",
      ).length,
      0,
    );
  });
});
