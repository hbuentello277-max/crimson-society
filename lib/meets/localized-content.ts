import type { SupportedLanguage } from "@/lib/i18n/language";

export type LocalizedMeetContentRow = {
  name?: string | null;
  description?: string | null;
  title_en?: string | null;
  title_es?: string | null;
  description_en?: string | null;
  description_es?: string | null;
  route_notes_en?: string | null;
  route_notes_es?: string | null;
  safety_notes_en?: string | null;
  safety_notes_es?: string | null;
  location_notes_en?: string | null;
  location_notes_es?: string | null;
  instructions_en?: string | null;
  instructions_es?: string | null;
};

export type ResolvedMeetContent = {
  name: string;
  description: string;
  routeNotes: string;
  safetyNotes: string;
  locationNotes: string;
  instructions: string;
  fallbackNotice: string | null;
};

const ENGLISH_ONLY_NOTICE = "Only available in English.";

function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

function resolveField(
  language: SupportedLanguage,
  englishValue: string,
  spanishValue: string,
) {
  if (language === "es") {
    return {
      value: spanishValue || englishValue,
      usedEnglishFallback: Boolean(englishValue && !spanishValue),
    };
  }

  return {
    value: englishValue,
    usedEnglishFallback: false,
  };
}

export function resolveLocalizedMeetContent(
  row: LocalizedMeetContentRow,
  language: SupportedLanguage = "en",
): ResolvedMeetContent {
  const title = resolveField(
    language,
    clean(row.title_en) || clean(row.name) || "Untitled Meet",
    clean(row.title_es),
  );
  const description = resolveField(
    language,
    clean(row.description_en) || clean(row.description),
    clean(row.description_es),
  );
  const routeNotes = resolveField(language, clean(row.route_notes_en), clean(row.route_notes_es));
  const safetyNotes = resolveField(language, clean(row.safety_notes_en), clean(row.safety_notes_es));
  const locationNotes = resolveField(
    language,
    clean(row.location_notes_en),
    clean(row.location_notes_es),
  );
  const instructions = resolveField(language, clean(row.instructions_en), clean(row.instructions_es));

  const usedEnglishFallback = [
    title,
    description,
    routeNotes,
    safetyNotes,
    locationNotes,
    instructions,
  ].some((field) => field.usedEnglishFallback);

  return {
    name: title.value,
    description: description.value,
    routeNotes: routeNotes.value,
    safetyNotes: safetyNotes.value,
    locationNotes: locationNotes.value,
    instructions: instructions.value,
    fallbackNotice: language === "es" && usedEnglishFallback ? ENGLISH_ONLY_NOTICE : null,
  };
}
