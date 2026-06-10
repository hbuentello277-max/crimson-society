import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextDmPlaybackSpeed } from "@/lib/messages/audio-playback";

describe("nextDmPlaybackSpeed", () => {
  it("cycles through 1x, 1.5x, and 2x", () => {
    assert.equal(nextDmPlaybackSpeed(1), 1.5);
    assert.equal(nextDmPlaybackSpeed(1.5), 2);
    assert.equal(nextDmPlaybackSpeed(2), 1);
  });
});
