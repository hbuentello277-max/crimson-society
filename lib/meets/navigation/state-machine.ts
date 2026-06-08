import type { NavigationGpsState } from "@/lib/meets/use-navigation-gps";
import type { GpsConnectionStatus, NavigationState } from "@/lib/meets/navigation/types";

export type NavigationStateInput = {
  authLoading: boolean;
  loadError: string | null;
  routeLoaded: boolean;
  gpsState: NavigationGpsState;
  isPaused: boolean;
  hasPosition: boolean;
};

export function mapGpsStateToConnection(gpsState: NavigationGpsState): GpsConnectionStatus {
  switch (gpsState) {
    case "requesting":
      return "requesting";
    case "active":
      return "connected";
    case "denied":
      return "denied";
    case "unavailable":
      return "unavailable";
    case "error":
      return "error";
    default:
      return "idle";
  }
}

export function deriveNavigationState(input: NavigationStateInput): NavigationState {
  if (input.authLoading || (input.routeLoaded === false && !input.loadError)) {
    return "loading";
  }

  if (input.loadError || !input.routeLoaded) {
    return "error";
  }

  if (input.isPaused) {
    return "paused";
  }

  if (input.gpsState === "denied") {
    return "gps_permission_required";
  }

  if (input.gpsState === "unavailable" || input.gpsState === "error") {
    return "error";
  }

  if (input.gpsState === "requesting" || input.gpsState === "idle") {
    return "gps_initializing";
  }

  if (input.gpsState === "active" && input.hasPosition) {
    return "navigating";
  }

  if (input.routeLoaded) {
    return "ready";
  }

  return "idle";
}

export function navigationStateLabel(state: NavigationState): string {
  switch (state) {
    case "idle":
      return "Idle";
    case "loading":
      return "Loading";
    case "gps_permission_required":
      return "GPS Required";
    case "gps_initializing":
      return "Acquiring GPS";
    case "ready":
      return "Ready";
    case "navigating":
      return "Navigating";
    case "paused":
      return "Paused";
    case "error":
      return "Error";
  }
}

export function gpsConnectionLabel(status: GpsConnectionStatus): string {
  switch (status) {
    case "idle":
      return "GPS Idle";
    case "requesting":
      return "Requesting GPS";
    case "connected":
      return "GPS Connected";
    case "denied":
      return "Permission Denied";
    case "unavailable":
      return "GPS Unavailable";
    case "error":
      return "GPS Error";
  }
}
