const PROFILE_MENU_SCROLL_STORAGE_KEY = "crimson_profile_menu_scroll_top";

/** Saved when leaving the menu for a subpage; restored when returning via /profile?menu=1. */
export function saveProfileMenuScrollTop(scrollTop: number) {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(scrollTop) || scrollTop < 0) return;
  sessionStorage.setItem(PROFILE_MENU_SCROLL_STORAGE_KEY, String(Math.round(scrollTop)));
}

export function readProfileMenuScrollTop(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PROFILE_MENU_SCROLL_STORAGE_KEY);
  if (raw == null) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/** Call when the user fully closes the menu from Profile (not when drilling into a subpage). */
export function clearProfileMenuScrollTop() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PROFILE_MENU_SCROLL_STORAGE_KEY);
}
