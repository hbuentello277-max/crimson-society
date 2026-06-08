export type MeetRoutePoint = {
  lat: number;
  lng: number;
};

export type NavigationTrackingPoint = MeetRoutePoint & {
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speedMph: number;
  timestamp: number;
};

/** Personal GPS session state (orphaned tracker hook). */
export type NavigationSessionStatus = "idle" | "requesting" | "active" | "paused" | "stopped";

/** @deprecated Use NavigationSessionStatus */
export type RideTrackingStatus = NavigationSessionStatus;

export type NavigationTrackingStats = {
  currentSpeedMph: number;
  topSpeedMph: number;
  averageSpeedMph: number;
  distanceMiles: number;
  durationMs: number;
};
