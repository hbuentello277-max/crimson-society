import type { RideTrackingPoint } from "@/types/rides";

export function formatRideDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function createRideTrackingPoint(position: GeolocationPosition, speedMph: number): RideTrackingPoint {
  return {
    lat: Number(position.coords.latitude.toFixed(6)),
    lng: Number(position.coords.longitude.toFixed(6)),
    accuracy: position.coords.accuracy ?? null,
    altitude: position.coords.altitude ?? null,
    heading: position.coords.heading ?? null,
    speedMph,
    timestamp: position.timestamp,
  };
}
