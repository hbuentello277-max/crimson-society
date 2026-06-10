import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DM_VOICE_MAX_SECONDS,
  DM_VOICE_MIN_SECONDS,
  formatVoiceTimer,
  normalizeRecordedMimeType,
  voiceBlobToFile,
} from "@/lib/messages/voice-recorder";

describe("formatVoiceTimer", () => {
  it("formats seconds as m:ss", () => {
    assert.equal(formatVoiceTimer(0), "0:00");
    assert.equal(formatVoiceTimer(9), "0:09");
    assert.equal(formatVoiceTimer(65), "1:05");
    assert.equal(formatVoiceTimer(60), "1:00");
  });
});

describe("normalizeRecordedMimeType", () => {
  it("strips codec suffixes and normalizes aliases", () => {
    assert.equal(normalizeRecordedMimeType("audio/webm;codecs=opus"), "audio/webm");
    assert.equal(normalizeRecordedMimeType("audio/x-m4a"), "audio/m4a");
  });
});

describe("voiceBlobToFile", () => {
  it("creates a file with a supported audio extension", () => {
    const file = voiceBlobToFile(new Blob(["audio"]), "audio/webm;codecs=opus");
    assert.equal(file.type, "audio/webm");
    assert.match(file.name, /^voice-\d+\.webm$/);
  });
});

describe("voice memo beta limits", () => {
  it("caps recordings at 60 seconds", () => {
    assert.equal(DM_VOICE_MAX_SECONDS, 60);
  });

  it("requires at least one second before send", () => {
    assert.equal(DM_VOICE_MIN_SECONDS, 1);
  });
});
