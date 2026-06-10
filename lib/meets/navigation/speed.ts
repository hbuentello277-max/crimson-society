import { getDistanceMiles } from "@/lib/gps/distance";
import type { NavigationPosition } from "@/lib/meets/navigation/types";

export const STATIONARY_SPEED_MPH = 3;
/** Discard GPS / derived samples above this — beyond any realistic motorcycle speed. */
export const MAX_REALISTIC_MOTORCYCLE_SPEED_MPH = 250;
/** Ignore derived speed when fixes arrive faster than this (prevents divide-by-tiny-time spikes). */
export const MIN_DERIVED_SPEED_ELAPSED_MS = 750;

export type NavigationSpeedHud = {
  currentMph: number;
};

export const EMPTY_NAVIGATION_SPEED_HUD: NavigationSpeedHud = {
  currentMph: 0,
};

export function isPlausibleMotorcycleSpeedMph(mph: number | null | undefined): mph is number {
  return (
    typeof mph === "number" &&
    Number.isFinite(mph) &&
    mph >= 0 &&
    mph <= MAX_REALISTIC_MOTORCYCLE_SPEED_MPH
  );
}

/** Normalize raw browser speed (m/s → mph) and discard impossible values. */
export function speedMphFromGeolocationMetersPerSecond(speedMps: number | null | undefined): number | null {
  if (typeof speedMps !== "number" || !Number.isFinite(speedMps) || speedMps < 0) {
    return null;
  }

  const mph = speedMps * 2.2369362921;
  return isPlausibleMotorcycleSpeedMph(mph) ? mph : null;
}

export function resolveCurrentSpeedMph(
  position: NavigationPosition | null,
  previous: NavigationPosition | null,
): number {
  if (!position) return 0;

  let mph: number | null = null;

  if (isPlausibleMotorcycleSpeedMph(position.speedMph)) {
    mph = position.speedMph;
  } else if (previous) {
    const elapsedMs = position.timestamp - previous.timestamp;
    if (elapsedMs >= MIN_DERIVED_SPEED_ELAPSED_MS) {
      const miles = getDistanceMiles(previous, position);
      const hours = elapsedMs / 3_600_000;
      const derived = miles / hours;
      if (isPlausibleMotorcycleSpeedMph(derived)) {
        mph = derived;
      }
    }
  }

  if (mph === null || mph < STATIONARY_SPEED_MPH) {
    return 0;
  }

  return Math.round(mph);
}

export function formatSpeedHudLabel(mph: number): string {
  const safe = isPlausibleMotorcycleSpeedMph(mph) ? Math.round(mph) : 0;
  return `${Math.max(0, safe)} mph`;
}
