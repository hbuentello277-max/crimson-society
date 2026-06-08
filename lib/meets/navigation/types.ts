import type { MeetLifecyclePhase } from "@/lib/meets/lifecycle";
import type { MeetTrackingStatus } from "@/lib/meets/types";
import type { RoutePoint } from "@/lib/meets/route-geometry";

/** Primary navigation lifecycle — drives page behavior. */
export type NavigationState =
  | "idle"
  | "loading"
  | "gps_permission_required"
  | "gps_initializing"
  | "ready"
  | "navigating"
  | "paused"
  | "error";

export type GpsConnectionStatus =
  | "idle"
  | "requesting"
  | "connected"
  | "denied"
  | "unavailable"
  | "error";

export type NavigationPosition = {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speedMph: number | null;
  timestamp: number;
};

export type NavigationRouteSegment = {
  index: number;
  start: RoutePoint;
  end: RoutePoint;
  distanceMiles: number;
};

/** Navigation-ready route abstraction (replaces raw point arrays in UI). */
export type NavigationRoute = {
  meetId: string;
  points: RoutePoint[];
  segments: NavigationRouteSegment[];
  totalDistanceMiles: number;
  meetPoint: string;
  destination: string;
  plannedDistanceLabel: string | null;
  plannedDurationLabel: string | null;
};

export type NavigationProgress = {
  currentSegmentIndex: number;
  currentRouteIndex: number;
  distanceTraveledMiles: number;
  distanceRemainingMiles: number;
  percentComplete: number;
};

/** HUD-facing metrics — placeholders allowed until later phases. */
export type NavigationMetrics = {
  etaLabel: string;
  distanceRemainingLabel: string;
  timeRemainingLabel: string;
  currentSpeedLabel: string;
  nextTurnLabel: string;
  routeProgressLabel: string;
};

export type NavigationMeetContext = {
  id: string;
  name: string;
  hostId: string | null;
  hostName: string | null;
  meetPoint: string;
  destination: string;
  trackingStatus: MeetTrackingStatus;
  lifecyclePhase: MeetLifecyclePhase;
  distanceLabel: string | null;
  durationLabel: string | null;
};

/** In-memory navigation session — single source of truth for the navigation page. */
export type NavigationSession = {
  meetId: string;
  userId: string;
  startedAt: string;
  gpsStatus: GpsConnectionStatus;
  routeLoaded: boolean;
  navigationState: NavigationState;
  latestPosition: NavigationPosition | null;
  route: NavigationRoute | null;
  meet: NavigationMeetContext | null;
  progress: NavigationProgress | null;
  metrics: NavigationMetrics;
  error: string | null;
  shareError: string | null;
  isPaused: boolean;
};

export const EMPTY_NAVIGATION_METRICS: NavigationMetrics = {
  etaLabel: "—",
  distanceRemainingLabel: "—",
  timeRemainingLabel: "—",
  currentSpeedLabel: "—",
  nextTurnLabel: "Follow route",
  routeProgressLabel: "0%",
};
