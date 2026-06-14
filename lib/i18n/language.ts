import en from "@/translations/en.json";
import es from "@/translations/es.json";

export const SUPPORTED_LANGUAGES = ["en", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "signup-language";

const dictionaries = { en, es } as const;

export type TranslationDictionary = typeof en;

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === "en" || value === "es";
}

export function normalizeLanguage(value: unknown): SupportedLanguage {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function getDictionary(language: SupportedLanguage): TranslationDictionary {
  return dictionaries[language] ?? dictionaries[DEFAULT_LANGUAGE];
}

export function translate(language: SupportedLanguage, key: string): string {
  const dictionary = getDictionary(language);
  const fallback = getDictionary(DEFAULT_LANGUAGE);
  const parts = key.split(".");

  const read = (source: unknown) =>
    parts.reduce<unknown>((current, part) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[part];
    }, source);

  const value = read(dictionary);
  if (typeof value === "string") return value;

  const fallbackValue = read(fallback);
  return typeof fallbackValue === "string" ? fallbackValue : key;
}

export function readStoredLanguage(storage: Pick<Storage, "getItem">): SupportedLanguage {
  return normalizeLanguage(storage.getItem(LANGUAGE_STORAGE_KEY));
}

export function writeStoredLanguage(
  storage: Pick<Storage, "setItem">,
  language: SupportedLanguage,
) {
  storage.setItem(LANGUAGE_STORAGE_KEY, language);
}
