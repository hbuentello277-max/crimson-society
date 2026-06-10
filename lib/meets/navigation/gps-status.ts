import type { GpsConnectionStatus, NavigationState } from "@/lib/meets/navigation/types";

export type NavigationGpsDisplayStatus =
  | "connected"
  | "recovering"
  | "permission_denied"
  | "unavailable"
  | "hidden";

export const NAVIGATION_GPS_STATUS_LABELS = {
  connected: "GPS Connected",
  recovering: "GPS signal lost. Reconnecting...",
  permission_denied: "Location permission required",
  unavailable: "GPS unavailable on this device",
} as const;

export function resolveNavigationGpsDisplayStatus(input: {
  gpsStatus: GpsConnectionStatus;
  navigationState: NavigationState;
}): NavigationGpsDisplayStatus {
  if (input.gpsStatus === "denied" || input.navigationState === "gps_permission_required") {
    return "permission_denied";
  }

  if (input.gpsStatus === "unavailable") {
    return "unavailable";
  }

  if (input.gpsStatus === "recovering") {
    return "recovering";
  }

  if (input.gpsStatus === "connected" && input.navigationState === "navigating") {
    return "connected";
  }

  return "hidden";
}

export function navigationGpsStatusLabel(status: NavigationGpsDisplayStatus): string | null {
  if (status === "hidden") return null;
  return NAVIGATION_GPS_STATUS_LABELS[status];
}
