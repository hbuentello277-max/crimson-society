"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useNexusStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStoredValue(key, fallback));

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Session storage can be unavailable in private contexts.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function useNexusScrollRestoration(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || restored.current) {
      return;
    }

    restored.current = true;
    const top = Number(window.sessionStorage.getItem(`${key}:scrollTop`) ?? 0);
    const windowTop = Number(window.sessionStorage.getItem(`${key}:windowScrollTop`) ?? 0);

    requestAnimationFrame(() => {
      if (ref.current && Number.isFinite(top)) {
        ref.current.scrollTop = top;
      }
      if (Number.isFinite(windowTop)) {
        window.scrollTo({ top: windowTop, left: 0, behavior: "instant" });
      }
    });
  }, [key]);

  useEffect(() => {
    const target = ref.current;

    const save = () => {
      try {
        window.sessionStorage.setItem(`${key}:windowScrollTop`, String(window.scrollY));
        if (target) {
          window.sessionStorage.setItem(`${key}:scrollTop`, String(target.scrollTop));
        }
      } catch {
        // Best-effort restoration only.
      }
    };

    save();
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", save);
    target?.addEventListener("scroll", save, { passive: true });

    return () => {
      save();
      window.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", save);
      target?.removeEventListener("scroll", save);
    };
  }, [key]);

  return ref;
}
