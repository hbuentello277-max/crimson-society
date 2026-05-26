export type RideRoutePoint = {
  lat: number;
  lng: number;
};

export type RideTrackingPoint = RideRoutePoint & {
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speedMph: number;
  timestamp: number;
};

export type RideTrackingStatus = "idle" | "requesting" | "active" | "paused" | "stopped";

export type RideTrackingStats = {
  currentSpeedMph: number;
  topSpeedMph: number;
  averageSpeedMph: number;
  distanceMiles: number;
  durationMs: number;
};
