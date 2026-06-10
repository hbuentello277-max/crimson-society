import { getDistanceMiles } from "@/lib/gps/distance";
import type { NavigationPosition } from "@/lib/meets/navigation/types";

export const STATIONARY_SPEED_MPH = 3;

export type NavigationSpeedHud = {
  currentMph: number;
  maxMph: number;
};

export const EMPTY_NAVIGATION_SPEED_HUD: NavigationSpeedHud = {
  currentMph: 0,
  maxMph: 0,
};

export function resolveCurrentSpeedMph(
  position: NavigationPosition | null,
  previous: NavigationPosition | null,
): number {
  if (!position) return 0;

  let mph: number | null = null;

  if (
    position.speedMph !== null &&
    Number.isFinite(position.speedMph) &&
    position.speedMph >= 0
  ) {
    mph = position.speedMph;
  } else if (previous) {
    const elapsedMs = position.timestamp - previous.timestamp;
    if (elapsedMs > 0) {
      const miles = getDistanceMiles(previous, position);
      const hours = elapsedMs / 3_600_000;
      const derived = miles / hours;
      if (Number.isFinite(derived) && derived >= 0) {
        mph = derived;
      }
    }
  }

  if (mph === null || mph < STATIONARY_SPEED_MPH) {
    return 0;
  }

  return Math.round(mph);
}

export function updateSessionMaxSpeedMph(currentMax: number, currentSpeedMph: number): number {
  if (currentSpeedMph <= 0) return currentMax;
  return Math.max(currentMax, currentSpeedMph);
}

export function formatSpeedHudLabel(mph: number): string {
  return `${Math.max(0, Math.round(mph))} mph`;
}
