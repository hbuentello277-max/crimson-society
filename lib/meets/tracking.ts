import type { NavigationTrackingPoint } from "@/types/meets";

export function formatMeetDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function createNavigationTrackingPoint(
  position: GeolocationPosition,
  speedMph: number,
): NavigationTrackingPoint {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    altitude: position.coords.altitude ?? null,
    heading: position.coords.heading ?? null,
    speedMph,
    timestamp: position.timestamp,
  };
}

/** @deprecated Use formatMeetDuration */
export function formatRideDuration(durationMs: number) {
  return formatMeetDuration(durationMs);
}

/** @deprecated Use createNavigationTrackingPoint */
export function createRideTrackingPoint(position: GeolocationPosition, speedMph: number) {
  return createNavigationTrackingPoint(position, speedMph);
}
