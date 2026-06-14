import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  readStoredLanguage,
  translate,
  writeStoredLanguage,
} from "@/lib/i18n/language";

describe("language helpers", () => {
  it("normalizes supported and unsupported language values", () => {
    assert.equal(normalizeLanguage("es"), "es");
    assert.equal(normalizeLanguage("en"), "en");
    assert.equal(normalizeLanguage("fr"), DEFAULT_LANGUAGE);
    assert.equal(normalizeLanguage(null), DEFAULT_LANGUAGE);
  });

  it("reads and writes the existing signup language storage key", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    writeStoredLanguage(storage, "es");
    assert.equal(store.get(LANGUAGE_STORAGE_KEY), "es");
    assert.equal(readStoredLanguage(storage), "es");
  });

  it("translates known keys and falls back to English", () => {
    assert.equal(translate("es", "auth.signupTitle"), "Solicitar acceso");
    assert.equal(translate("es", "common.save"), "Guardar");
    assert.equal(translate("es", "missing.key"), "missing.key");
  });
});
