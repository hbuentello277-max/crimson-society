import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveLocalizedMeetContent } from "@/lib/meets/localized-content";

describe("localized meet content", () => {
  it("renders English content by default", () => {
    const content = resolveLocalizedMeetContent(
      {
        name: "Sunday Canyon Run",
        description: "Bring a full tank.",
      },
      "en",
    );

    assert.equal(content.name, "Sunday Canyon Run");
    assert.equal(content.description, "Bring a full tank.");
    assert.equal(content.fallbackNotice, null);
  });

  it("renders Spanish meet content when available", () => {
    const content = resolveLocalizedMeetContent(
      {
        name: "Sunday Canyon Run",
        title_es: "Ruta del cañón",
        description: "Bring a full tank.",
        description_es: "Llega con tanque lleno.",
        safety_notes_en: "Helmet required.",
        safety_notes_es: "Casco obligatorio.",
      },
      "es",
    );

    assert.equal(content.name, "Ruta del cañón");
    assert.equal(content.description, "Llega con tanque lleno.");
    assert.equal(content.safetyNotes, "Casco obligatorio.");
    assert.equal(content.fallbackNotice, null);
  });

  it("falls back to English and reports the required notice when Spanish is missing", () => {
    const content = resolveLocalizedMeetContent(
      {
        title_en: "Hill Country Loop",
        description_en: "Expect staggered formation.",
        safety_notes_en: "No passing in the group.",
      },
      "es",
    );

    assert.equal(content.name, "Hill Country Loop");
    assert.equal(content.description, "Expect staggered formation.");
    assert.equal(content.safetyNotes, "No passing in the group.");
    assert.equal(content.fallbackNotice, "Only available in English.");
  });
});
