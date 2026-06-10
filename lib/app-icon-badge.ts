import { formatNavBadgeCount } from "@/lib/nav-badge-format";

type NavigatorWithBadge = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function isAppIconBadgeSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavigatorWithBadge;
  return typeof nav.setAppBadge === "function";
}

function badgeNumberForApi(count: number): number | undefined {
  if (count <= 0) return undefined;
  if (count > 99) return 99;
  return count;
}

/** Sync home-screen / installed PWA icon badge (Badging API). */
export async function syncAppIconBadge(count: number): Promise<void> {
  if (!isAppIconBadgeSupported()) return;

  const nav = navigator as NavigatorWithBadge;

  try {
    const badgeNumber = badgeNumberForApi(count);
    if (badgeNumber === undefined) {
      await nav.clearAppBadge?.();
      return;
    }

    await nav.setAppBadge?.(badgeNumber);
  } catch (error) {
    console.warn("App icon badge sync failed:", error);
  }
}

/** Human-readable badge label for diagnostics (matches in-app caps). */
export function appIconBadgeLabel(count: number): string | null {
  if (count <= 0) return null;
  return formatNavBadgeCount(count);
}
