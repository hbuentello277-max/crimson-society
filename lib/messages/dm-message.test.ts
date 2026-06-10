import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDmMediaPath,
  DM_AUDIO_MAX_BYTES,
  dmMessagePreview,
  validateDmAudioFile,
} from "@/lib/messages/dm-message";

describe("dmMessagePreview", () => {
  it("labels audio messages as voice messages", () => {
    assert.equal(
      dmMessagePreview({ message_type: "audio", body: "" }),
      "Voice message",
    );
  });
});

describe("validateDmAudioFile", () => {
  it("accepts supported browser audio formats within beta size limit", () => {
    const file = new File([new Uint8Array(1024)], "memo.webm", { type: "audio/webm" });
    assert.equal(validateDmAudioFile(file), null);
  });

  it("rejects unsupported mime types", () => {
    const file = new File([new Uint8Array(10)], "memo.wav", { type: "audio/wav" });
    assert.match(validateDmAudioFile(file) ?? "", /Unsupported audio format/i);
  });

  it("rejects oversized uploads with a friendly message", () => {
    const oversized = new File([new Uint8Array(DM_AUDIO_MAX_BYTES + 1)], "memo.webm", {
      type: "audio/webm",
    });
    assert.match(validateDmAudioFile(oversized) ?? "", /10 MB or smaller/i);
  });

  it("rejects empty recordings", () => {
    const file = new File([], "memo.webm", { type: "audio/webm" });
    assert.match(validateDmAudioFile(file) ?? "", /empty/i);
  });
});

describe("buildDmMediaPath", () => {
  it("stores audio under the conversation folder", () => {
    assert.equal(
      buildDmMediaPath("conv-1", "msg-1", "audio/webm"),
      "conv-1/msg-1.webm",
    );
  });
});

describe("DM_AUDIO_MAX_BYTES", () => {
  it("uses a hobby-safe 10 MB cap for 60 second voice memos", () => {
    assert.equal(DM_AUDIO_MAX_BYTES, 10 * 1024 * 1024);
  });
});
