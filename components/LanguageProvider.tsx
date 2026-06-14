"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  getDictionary,
  isSupportedLanguage,
  normalizeLanguage,
  translate,
  writeStoredLanguage,
  type SupportedLanguage,
  type TranslationDictionary,
} from "@/lib/i18n/language";
import { updateProfileLanguage } from "@/lib/profile";

type LanguageContextValue = {
  language: SupportedLanguage;
  dictionary: TranslationDictionary;
  t: (key: string) => string;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  dictionary: getDictionary(DEFAULT_LANGUAGE),
  t: (key) => translate(DEFAULT_LANGUAGE, key),
  setLanguage: async () => {},
});

function initialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { profile, session, refreshProfile } = useAuth();
  const userId = session?.user?.id ?? null;
  const [language, setLanguageState] = useState<SupportedLanguage>(initialLanguage);

  const persistLocalLanguage = useCallback((next: SupportedLanguage) => {
    if (typeof window === "undefined") return;
    writeStoredLanguage(window.localStorage, next);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }

    persistLocalLanguage(language);
  }, [language, persistLocalLanguage]);

  useEffect(() => {
    const preferred = profile?.preferred_language;
    if (isSupportedLanguage(preferred) && preferred !== language) {
      queueMicrotask(() => setLanguageState(preferred));
    }
  }, [language, profile?.preferred_language]);

  useEffect(() => {
    if (!userId || profile?.preferred_language) return;
    if (language === DEFAULT_LANGUAGE) return;

    void updateProfileLanguage(userId, language)
      .then(() => refreshProfile())
      .catch(() => undefined);
  }, [language, profile?.preferred_language, refreshProfile, userId]);

  const setLanguage = useCallback(
    async (next: SupportedLanguage) => {
      setLanguageState(next);
      persistLocalLanguage(next);

      if (!userId) return;

      await updateProfileLanguage(userId, next);
      await refreshProfile();
    },
    [persistLocalLanguage, refreshProfile, userId],
  );

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      dictionary: getDictionary(language),
      t: (key) => translate(language, key),
      setLanguage,
    };
  }, [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  return useContext(LanguageContext);
}
