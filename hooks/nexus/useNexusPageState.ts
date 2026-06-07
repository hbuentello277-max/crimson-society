"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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
  const restore = useCallback(() => {
    const top = Number(window.sessionStorage.getItem(`${key}:scrollTop`) ?? 0);
    const windowTop = Number(window.sessionStorage.getItem(`${key}:windowScrollTop`) ?? 0);

    if (ref.current && Number.isFinite(top)) {
      ref.current.scrollTop = top;
    }
    if (Number.isFinite(windowTop)) {
      window.scrollTo({ top: windowTop, left: 0, behavior: "instant" });
    }
  }, [key]);

  const save = useCallback(() => {
    try {
      window.sessionStorage.setItem(`${key}:windowScrollTop`, String(window.scrollY));
      if (ref.current) {
        window.sessionStorage.setItem(`${key}:scrollTop`, String(ref.current.scrollTop));
      }
    } catch {
      // Best-effort restoration only.
    }
  }, [key]);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || restored.current) {
      return;
    }

    restored.current = true;
    requestAnimationFrame(restore);
    window.setTimeout(restore, 80);
    window.setTimeout(restore, 240);
  }, [restore]);

  useEffect(() => {
    const target = ref.current;
    const handlePageShow = () => {
      requestAnimationFrame(restore);
      window.setTimeout(restore, 80);
    };

    save();
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePageShow);
    document.addEventListener("visibilitychange", save);
    target?.addEventListener("scroll", save, { passive: true });
    target?.addEventListener("pointerdown", save, { passive: true });
    target?.addEventListener("click", save, { passive: true });

    return () => {
      save();
      window.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePageShow);
      document.removeEventListener("visibilitychange", save);
      target?.removeEventListener("scroll", save);
      target?.removeEventListener("pointerdown", save);
      target?.removeEventListener("click", save);
    };
  }, [restore, save]);

  return { ref, save, restore };
}
